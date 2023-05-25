import { ScrollAdapter } from '../abstract/ScrollAdapter';
import { Orientation, ScrollbarDirection, Transition } from '../define/enum';
import { Helper } from '../help/helper';
import { ADAPTER, ScrollManager } from '../manager/ScrollManager';
const { ccclass, property } = cc._decorator;
const MIN_SIZE_PERCENTAGE = 0.01
const _tempColor = new cc.Color()
interface ITransitionInfo {
    time: number
    current?: cc.Color | cc.Vec2
    from: cc.Color | cc.Vec3
    to: cc.Color | cc.Vec2 | cc.Vec3
}
@ccclass
export class Scrollbar extends cc.Component {
    @property(ScrollAdapter) adapter: ScrollAdapter = null
    @property(cc.Sprite) handle: cc.Sprite = null
    @property({
        type: ScrollbarDirection,
        tooltip: "滚动方向"
    }) direction: ScrollbarDirection = ScrollbarDirection.Top_To_Bottom
    @property({
        tooltip: "开启后会允许用户滑动进度条"
    }) interactable: boolean = true
    @property({
        range: [0, 1], slide: true, step: 0.001,
        visible: function () { return this.interactable },
        tooltip: "可拖拽的最小限制，默认=0不限制,仅当你开启了循环,并且你的item会实时修改主轴尺寸时,那么你应该适当限制拖拽区域"
    }) dragMinLimit: number = 0
    @property({
        range: [0, 1], slide: true, step: 0.001,
        visible: function () { return this.interactable },
        tooltip: "可拖拽的最大限制，默认=1不限制,仅当你开启了循环,并且你的item会实时修改主轴尺寸时,那么你应该适当限制拖拽区域"
    }) dragMaxLimit: number = 1
    @property({ type: Transition }) _transition: Transition = Transition.None
    @property({
        type: Transition,
        visible: function () { return this.interactable }
    }) get transition() { return this._transition }
    set transition(value: Transition) {
        if (value == this._transition) return
        this._transition = value
        if (value != Transition.None) {
            if (!this.targetGraphic) {
                this.targetGraphic = this.handle
            }
        }
    }
    @property({
        type: cc.Sprite,
        visible: function () { return this.transition != Transition.None && this.interactable }
    }) targetGraphic: cc.Sprite = null
    //#region Sprite Transition
    @property({
        type: cc.SpriteFrame,
        visible: function () { return this.transition == Transition.SpriteSwap && this.interactable }
    }) hoverSprite: cc.SpriteFrame = null
    @property({
        type: cc.SpriteFrame,
        visible: function () { return this.transition == Transition.SpriteSwap && this.interactable }
    }) pressedSprite: cc.SpriteFrame = null
    //#endregion
    //#region Color Transition
    @property({
        visible: function () { return this.transition == Transition.ColorTint && this.interactable }
    }) hoverColor: cc.Color = cc.Color.WHITE.clone()
    @property({
        visible: function () { return this.transition == Transition.ColorTint && this.interactable }
    }) pressedColor: cc.Color = new cc.Color(211, 211, 211, 255)

    //#endregion
    //#region Scale Transition
    @property({
        visible: function () { return this.transition == Transition.Scale && this.interactable }
    }) hoverScale: cc.Vec2 = new cc.Vec2(1, 1)
    @property({
        visible: function () { return this.transition == Transition.Scale && this.interactable }
    }) pressedScale: cc.Vec2 = new cc.Vec2(1.2, 1.2)
    //#endregion
    @property({
        visible: function () { return this.transition == Transition.Scale || this.transition == Transition.ColorTint && this.interactable }
    }) transitionDuration: number = 0.2
    @property({
        range: [0, 11],
        slide: true,
        step: 1,
        tooltip: "用于进度的步数。值为 < 2 将禁用"
    }) numberOfSteps: number = 0
    @property({
        tooltip: "开启后会在滚动条无更新时自动隐藏"
    }) enableAutoHide: boolean = false
    @property({
        visible: function () { return this.enableAutoHide },
        tooltip: "自动隐藏滚动条的时间"
    }) autoHideTime: number = 1

    private _transitionInfo: ITransitionInfo
    private _targetEnter: boolean
    private _targetStart: boolean
    private _isDirty: boolean = false
    private _transform: cc.Node
    private _handleTransform: cc.Node
    private _size: number = 0
    private _value: number = -1
    private _pointerEvent: cc.Event.EventTouch
    private _offset: cc.Vec3
    private _isHide: boolean
    private _opacity = 255
    private _autoHideRemainingTime: number
    private _rawTargetScale: cc.Vec3
    private _rawTargetFrame: cc.SpriteFrame
    private _rawTargetColor: cc.Color
    get size() { return this._size }
    set size(v: number) {
        if (v != this._size) {
            this._size = Helper.clamp(v, MIN_SIZE_PERCENTAGE, 1)
            this._isDirty = true
        }
    }
    public get value() { return this._value }
    public set value(v: number) {
        if (v != this._value) {
            this._value = this.getSteps(v)
            this._isDirty = true
        }
    }
    public get stepSize() {
        return (this.numberOfSteps > 1) ? 1 / (this.numberOfSteps - 1) : 0.1
    }
    public get transform() {
        if (!this._transform) {
            this._transform = this.node
        }
        return this._transform
    }
    public get handleTransform() {
        if (!this.handle) return null
        if (!this._handleTransform) {
            this._handleTransform = this.handle.node
        }
        return this._handleTransform
    }
    protected get xy() { return this.axis == Orientation.Horizontal ? "x" : "y" }
    protected get wh() { return this.axis == Orientation.Horizontal ? "width" : "height" }

    public get axis() {
        return (this.direction == ScrollbarDirection.Left_To_Right || this.direction == ScrollbarDirection.Right_To_Left) ? Orientation.Horizontal : Orientation.Vertical
    }
    protected __preload() {
        this.transform.setAnchorPoint(0.5, 0.5)
        this.handleTransform.setAnchorPoint(0.5, 0.5)
        this.handle.node.setPosition(0, 0)
        if (this.adapter) {
            this.adapter.scrollManager.on(ScrollManager.Event.ON_UPDATE_PERCENTAGE, this._onUpdateScrollbar, this)
            this._updateVisuals()
        }
        if (this.targetGraphic) {
            this.targetGraphic.node.getScale(this._rawTargetScale)
            this._rawTargetFrame = this.targetGraphic.spriteFrame
            this._rawTargetColor = this.targetGraphic.node.color.clone()
        }
        this._openAutoHide(true)
    }
    protected onEnable() {
        const renderComp = this.node
        if (renderComp) {
            this._opacity = renderComp.opacity
        }
        if (this.adapter) {
            this.node[ADAPTER] = true
            this.node.on(cc.Node.EventType.TOUCH_START, this._onTouchStart, this)
            this.node.on(cc.Node.EventType.TOUCH_MOVE, this._onTouchMove, this)
            this.node.on(cc.Node.EventType.TOUCH_END, this._onTouchEnd, this)
            this.node.on(cc.Node.EventType.TOUCH_CANCEL, this._onTouchEnd, this)
            this.node.on(cc.Node.EventType.MOUSE_ENTER, this._mouseEnter, this)
            this.node.on(cc.Node.EventType.MOUSE_LEAVE, this._mouseLeave, this)
            if (this.targetGraphic) {
                this.targetGraphic.node.on(cc.Node.EventType.MOUSE_ENTER, this._targetMouseEnter, this)
                this.targetGraphic.node.on(cc.Node.EventType.MOUSE_LEAVE, this._targetMouseLeave, this)
            }
        }
    }
    protected onDisable() {
        this.node.off(cc.Node.EventType.TOUCH_START, this._onTouchStart, this)
        this.node.off(cc.Node.EventType.TOUCH_MOVE, this._onTouchMove, this)
        this.node.off(cc.Node.EventType.TOUCH_END, this._onTouchEnd, this)
        this.node.off(cc.Node.EventType.TOUCH_CANCEL, this._onTouchEnd, this)
        this.node.off(cc.Node.EventType.MOUSE_ENTER, this._mouseEnter, this)
        this.node.off(cc.Node.EventType.MOUSE_LEAVE, this._mouseLeave, this)
        if (this.targetGraphic) {
            this.targetGraphic.node.off(cc.Node.EventType.MOUSE_ENTER, this._targetMouseEnter, this)
            this.targetGraphic.node.off(cc.Node.EventType.MOUSE_LEAVE, this._targetMouseLeave, this)
        }
    }
    private _targetMouseEnter() {
        this._targetEnter = true
        this._openAutoHide(false)
        switch (this.transition) {
            case Transition.Scale:
                this._transitionScale(this._targetStart ? this.pressedScale : this.hoverScale)
                break
            case Transition.SpriteSwap:
                this._transitionSprite(this._targetStart ? this.pressedSprite : this.hoverSprite)
                break
            case Transition.ColorTint:
                this._transitionColor(this._targetStart ? this.pressedColor : this.hoverColor)
                break
        }
    }
    private _targetMouseLeave() {
        this._targetEnter = false
        this._openAutoHide(true)
        switch (this.transition) {
            case Transition.Scale:
                this._transitionScale(this._targetStart ? this.pressedScale : this._rawTargetScale)
                break
            case Transition.SpriteSwap:
                this._transitionSprite(this._targetStart ? this.pressedSprite : this._rawTargetFrame)
                break
            case Transition.ColorTint:
                this._transitionColor(this._targetStart ? this.pressedColor : this._rawTargetColor)
                break
        }
    }
    private _transitionScale(to: cc.Vec2 | cc.Vec3) {
        if (!to || !this.targetGraphic) return
        var from = new cc.Vec3()
        this.targetGraphic.node.getScale(from)
        this._transitionInfo = {
            time: 0,
            from: from,
            to: to,
        }
    }
    private _transitionColor(to: cc.Color) {
        if (!to || !this.targetGraphic) return
        this._transitionInfo = {
            time: 0,
            from: this.targetGraphic.node.color,
            to: to,
        }
    }
    private _transitionSprite(to: cc.SpriteFrame) {
        if (!to || !this.targetGraphic) return
        this.targetGraphic.spriteFrame = to
    }
    private _mouseEnter(event: cc.Event.EventMouse) {
        if (!this.interactable) return
        this._openAutoHide(false)
    }
    private _mouseLeave(event: cc.Event.EventMouse) {
        if (!this.interactable) return
        this._openAutoHide(true)
    }
    private _openAutoHide(open: boolean) {
        if (!this.enableAutoHide) return
        this._autoHideRemainingTime = this.autoHideTime
        this._isHide = open
        if (!open) {
            this._setOpacity(this._opacity)
        }
    }
    private _onTouchStart(event: cc.Event.EventTouch) {
        if (!this.interactable || this.size == 1 || this.size == 0) return
        this._openAutoHide(false)
        this._pointerEvent = null
        this._targetStart = true
        var startCursor = event.getStartLocation()
        this._offset = this.handleTransform.convertToNodeSpaceAR(cc.v3(startCursor.x, startCursor.y))
        if (Math.abs(this._offset[this.xy]) > this.handleTransform[this.wh] * 0.5) {
            this._offset = null
            this._pointerEvent = event
            var percentage = this._calcPercentage(event)
            this._setPercentage(percentage)
        }
        if (this.transition == Transition.Scale) {
            this._transitionScale(this.pressedScale)
        } else if (this.transition == Transition.SpriteSwap) {
            this._transitionSprite(this.pressedSprite)
        } else if (this.transition == Transition.ColorTint) {
            this._transitionColor(this.pressedColor)
        }
    }
    private _onTouchMove(event: cc.Event.EventTouch) {
        if (!this.interactable || this.size == 1 || this.size == 0) return
        if (this._offset) {
            var percentage = this._calcPercentage(event, this._offset[this.xy])
            this._setPercentage(percentage)
        }
    }
    private _onTouchEnd(event: cc.Event.EventTouch) {
        if (!this.interactable || this.size == 1 || this.size == 0) return
        this._offset = null
        this._pointerEvent = null
        this._targetStart = false
        switch (this.transition) {
            case Transition.Scale:
                this._transitionScale(this._targetEnter ? this.hoverScale : this._rawTargetScale)
                break
            case Transition.SpriteSwap:
                this._transitionSprite(this._targetEnter ? this.hoverSprite : this._rawTargetFrame)
                break
            case Transition.ColorTint:
                this._transitionColor(this._targetEnter ? this.hoverColor : this._rawTargetColor)
                break
        }
        this.adapter.centerManager.scrollToCenter()
    }
    private _setPercentage(percentage: number) {
        this.adapter.scrollManager.stopScroll()
        this.adapter.scrollManager.setPercentage(percentage)
    }
    private _calcPercentage(event: cc.Event.EventTouch, offset: number = 0) {
        var parentSize = this.axis == Orientation.Horizontal ? this.transform.width : this.transform.height
        var remainingSize = parentSize * (1 - this.size)
        var localCursor = event.getLocation()
        var pos = this.transform.convertToNodeSpaceAR(cc.v3(localCursor.x, localCursor.y))
        var handleCorner = pos[this.xy] - offset - -this.transform[this.wh] * 0.5
        handleCorner -= this.handleTransform[this.wh] * 0.5
        var percentage = this.adapter.scrollManager.percentage

        switch (this.direction) {
            case ScrollbarDirection.Right_To_Left:
            case ScrollbarDirection.Top_To_Bottom:
                percentage = Helper.clamp(1 - (handleCorner / remainingSize), this.dragMinLimit, this.dragMaxLimit)
                break
            case ScrollbarDirection.Left_To_Right:
            case ScrollbarDirection.Bottom_To_Top:
                percentage = Helper.clamp(handleCorner / remainingSize, this.dragMinLimit, this.dragMaxLimit)
                break
        }
        return this.getSteps(percentage)
    }
    private _onUpdateScrollbar(percentage: number, offset: number) {
        var size = 0
        var value = 0
        if (this.adapter.viewManager.virtualSize > 0) {
            if (this.adapter.viewManager.virtualSize >= this.adapter.mainAxisSize) {
                size = Helper.clamp01((this.adapter.mainAxisSize - Math.abs(offset)) / this.adapter.viewManager.virtualSize)
            } else {
                size = 1
            }
        }
        value = percentage
        this.size = size
        if (this.numberOfSteps > 1) {
            value = Math.round(value * (this.numberOfSteps - 1)) / (this.numberOfSteps - 1)
            value = Helper.clamp01(value)
        }
        this.value = value
        this._autoHideRemainingTime = this.autoHideTime
        this._setOpacity(this._opacity)
    }
    private _updateVisuals() {
        if (!this.handleTransform || !this.adapter) return
        var min = { x: 0, y: 0 }
        var max = { x: 0, y: 0 }
        var mainAxis = this.adapter.mainAxis
        var movement = Helper.clamp01(this.value) * (1 - this.size)
        min[mainAxis] = movement
        max[mainAxis] = movement + this.size
        var header = this.transform.getContentSize()[this.wh] - max[mainAxis] * this.transform.getContentSize()[this.wh]
        var footer = min[mainAxis] * this.transform.getContentSize()[this.wh]
        var pos = this.handle.node.getPosition()
        switch (this.direction) {
            case ScrollbarDirection.Bottom_To_Top:
            case ScrollbarDirection.Left_To_Right:
                pos[this.xy] = (footer - header) * 0.5
                break
            case ScrollbarDirection.Top_To_Bottom:
            case ScrollbarDirection.Right_To_Left:
                pos[this.xy] = (header - footer) * 0.5
                break
        }
        this.handleTransform[this.wh] = this.transform.getContentSize()[this.wh] - header - footer
        this.handle.node.setPosition(pos)
    }
    protected update(deltaTime: number) {
        this._clearDirty()
        this._autoHide(deltaTime)
        this._tranitionHandler(deltaTime)
    }
    private _clearDirty() {
        if (this._isDirty) {
            this._isDirty = false
            this._updateVisuals()
            if (this._pointerEvent) {
                var startCursor = this._pointerEvent.getLocation()
                this._offset = this.handleTransform.convertToNodeSpaceAR(cc.v3(startCursor.x, startCursor.y))
                this._pointerEvent = null
            }
        }
    }
    private _autoHide(deltaTime: number) {
        if (!this.enableAutoHide) return
        if (!this._isHide || this._autoHideRemainingTime <= 0) return
        this._autoHideRemainingTime -= deltaTime
        if (this._autoHideRemainingTime <= this.autoHideTime) {
            this._autoHideRemainingTime = Math.max(0, this._autoHideRemainingTime)
            var opacity = this._opacity * (this._autoHideRemainingTime / this.autoHideTime)
            this._setOpacity(opacity)
        }
    }
    private _tranitionHandler(deltaTime: number) {
        var target = this.targetGraphic
        if (this.transition == Transition.None || !target || !this._transitionInfo) return
        this._transitionInfo.time += deltaTime
        let ratio = 1.0
        if (this.transitionDuration > 0) {
            ratio = this._transitionInfo.time / this.transitionDuration
        }
        if (ratio >= 1) {
            ratio = 1
        }
        if (this.transition == Transition.Scale) {
            this._transitionInfo.current = target.node.getScale(cc.v2())
            let from = this._transitionInfo.from as cc.Vec3
            let to = this._transitionInfo.to as cc.Vec2
            this._transitionInfo.current.x = Helper.lerp(from.x, to.x, ratio)
            this._transitionInfo.current.y = Helper.lerp(from.y, to.y, ratio)
            target.node.setScale(this._transitionInfo.current)
        } else if (this.transition == Transition.ColorTint) {
            let from = this._transitionInfo.from as cc.Color
            let to = this._transitionInfo.to as cc.Color
            // _tempColor = from.lerp(to, ratio)
            target.node.color = from.lerp(to, ratio)
        }
        if (ratio === 1) {
            this._transitionInfo = null
        }
    }
    private _setOpacity(opacity: number) {
        if (!this.handle) return
        const handler = function (comp: any) {
            if (comp) {
                comp.opacity = opacity
                // _tempColor.set(comp.color)
                // _tempColor.a = opacity
                // comp.color = _tempColor
            }
        }
        handler(this.node.getComponent(cc.Sprite))
        handler(this.handle.getComponent(cc.Sprite))
    }
    private getSteps(percentage: number) {
        if (this.numberOfSteps > 1) {
            percentage = Math.round(percentage * (this.numberOfSteps - 1)) / (this.numberOfSteps - 1)
            percentage = Helper.clamp(percentage, this.dragMinLimit, this.dragMaxLimit)
        }
        return percentage
    }
}


