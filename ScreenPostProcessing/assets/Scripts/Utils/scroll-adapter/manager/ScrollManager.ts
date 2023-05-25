// import { UITransform, Widget, _decorator, Node, cc.Event.EventTouch, Vec3, instantiate, cc.Event.EventMouse, macro, easing, NodeEventType, Label, sp, Graphics, Color } from 'cc';
import { Manager } from '../abstract/Manager';
import { ScrollAdapter } from '../abstract/ScrollAdapter';
import { ADAPTER_DEBUG_CONTENT, DEBUG_DRAW_LIND_WIDTH, DEBUG_DRAW_FILL_COLOR, DEBUG_DRAW_BORDER_COLOR } from '../define/debug';
import { AlwaysScroll, Layer, MovementType, NestedDirection, Orientation, ScrollDirection, TouchMode } from '../define/enum';
import { ILike } from '../define/interface';
import { Helper } from '../help/helper';
import { ViewManager } from './ViewManager';
const { ccclass, property } = cc._decorator;
const _tempPosition = new cc.Vec3()
export const ADAPTER = '__ADAPTER__'
interface IScrollHandle {
    stop?: Function
    change?: Function
    deltaTime: number
    duration: number
    current: number
    from: number
    to: number,
}
enum Event {
    /** 滚动中 */
    ON_SCROLL,

    /** 更新滚动百分比 */
    ON_UPDATE_PERCENTAGE,

    /** 当View 尺寸变化时 */
    ON_VIEW_SIZE_CHANGED,

    /** 当自动滚动即将停止时 */
    ON_ABOUT_TO_STOP,

    /** 当滚动开始时 */
    ON_SCROLL_START,

    /** 当滚动抬起时 */
    ON_SCROLL_END,

    /** 当滚动取消时 */
    ON_SCROLL_CANCEL,

    /** 当主轴方向改变时 */
    ON_CHANGED_ORIENTATION,

    /** 当滚动到指定单行索引之前 */
    ON_SCROLL_TO_GROUPINDEX_BEFOR,

    /** 当滚动到指定单行索引之后 */
    ON_SCROLL_TO_GROUPINDEX_AFTER,

    /** 当滚动到指定数据索引之后 */
    ON_SCROLL_TO_MODELINDEX_BEFOR,

    /** 当滚动到指定数据索引之后 */
    ON_SCROLL_TO_MODELINDEX_AFTER,
}
@ccclass('ScrollManager')
export class ScrollManager extends Manager {
    public static Event = Event
    @property() private _view: cc.Node = null
    @property({ type: cc.Node }) get view() { return this._view }
    set view(value: cc.Node) {
        this._view = value
    }
    @property() private _content: cc.Node = null
    @property({ type: cc.Node }) get content() { return this._content }
    private set content(value: cc.Node) {
        this._content = value
    }
    @property({ type: Orientation }) private _orientation: Orientation = Orientation.Vertical
    @property({ type: Orientation }) get orientation() { return this._orientation }
    set orientation(value: Orientation) {
        if (value == this._orientation) return
        this._orientation = value
        this.emit(Event.ON_CHANGED_ORIENTATION)
    }
    @property({
        type: TouchMode,
        tooltip: `Auto: 当内容撑满可视区域或开启ReleaseManager时允许拖动
        AlwaysAllow: 任何情况下都可以拖动，即使没有任何元素
        Disabled: 任何情况下都禁用拖动
        `
    }) touchMode: TouchMode = TouchMode.Auto
    @property({ type: MovementType }) movementType: MovementType = MovementType.Elastic
    @property({
        range: [0, 1], slide: true, step: 0.001,
        visible: function () { return this.movementType == MovementType.Elastic }
    }) elasticity: number = 0.1
    @property() inertia: boolean = true
    @property({
        range: [0, 1], slide: true, step: 0.001,
        visible: function () { return this.inertia }
    }) decelerationRate: number = 0.135
    // TODO 鼠标滚轮暂时不做，感觉不是必要功能
    // @property scrollSensitivity: number = 0.01 
    @property({
        tooltip: "当滚动速度小于这个值时，会发送ON_ABOUT_TO_STOP广播"
    }) aboutToStopVelocity: number = 100
    @property({
        tooltip: "取消子节点的Button点击事件"
    }) cancelInnerEvents: boolean = true
    @property({
        range: [0, 0.5], slide: true, step: 0.001,
        visible: function () { return this.inertia },
        tooltip: `嵌套时，当子元素的ScrollView拖动方向和当前拖动方向相同时，使用当前阈值进行计算由谁来处理拖动
        无特殊需求时，默认值即可`
    }) nestedMinThreshold: number = 0.001
    @property({
        range: [0.5, 1], slide: true, step: 0.001,
        visible: function () { return this.inertia },
        tooltip: `嵌套时，当子元素的ScrollView拖动方向和当前拖动方向相同时，使用当前阈值进行计算由谁来处理拖动
        无特殊需求时，默认值即可`
    }) nestedMaxThreshold: number = 0.999
    private __debug_graphics: cc.Graphics
    private _boundaryOffset: number = 0
    private _viewWidget: cc.Widget = null
    private _parentAdapter: ScrollAdapter
    private _layerLowest: cc.Node
    private _layerMedium: cc.Node
    private _layerHighest: cc.Node
    private _percentage: number = 0
    private _velocity: number = 0
    private _dragging: boolean = false
    private _scrolling: boolean = false
    private _isCanceledEvent: boolean = false
    private _contentStartPosition: cc.Vec2 = new cc.Vec2()
    private _prevContentPosition: cc.Vec2 = new cc.Vec2()
    private _nestedDirection: NestedDirection = NestedDirection.Both
    private _parentTouch: boolean = false
    private _stopCheckNested: boolean = false
    private _scrollHandlePercentage: IScrollHandle = null
    private _scrollHandlePosition: IScrollHandle = null
    private _isEmitAboutToStop: boolean = false
    private _isMyEventAndMoved: boolean = false
    private _scrollDirection: ScrollDirection = ScrollDirection.None
    private _laseScrollDirection: ScrollDirection = ScrollDirection.None
    private _touchEvent: cc.Event.EventTouch = null
    private get _viewMin() { return -this.adapter.mainAxisSize }
    private get _viewMax() { return this.adapter.mainAxisSize }
    private get _defaultMin() { return this.adapter.multiplier == 1 ? -this.adapter.mainAxisSize : 0 }
    private get _defaultMax() { return this.adapter.multiplier == 1 ? 0 : this.adapter.mainAxisSize }
    public get isMyEventAndMoved() { return this._isMyEventAndMoved }
    public get velocity() { return this._velocity }
    public get scrollDirection() { return this._scrollDirection }
    public get laseScrollDirection() { return this._laseScrollDirection }
    public get percentage() { return this._percentage }
    public get dragging() { return this._dragging }
    public get boundaryOffset() { return this._boundaryOffset }
    public get parentAdapter() { return this._parentAdapter }
    public get canAutoScroll() {
        return !this.dragging && this.adapter.viewManager.virtualSize > this.adapter.mainAxisSize
    }
    public get canTouch() {
        if (this.touchMode == TouchMode.AlwaysAllow) {
            return true
        }
        if (this.touchMode == TouchMode.Disabled) {
            return false
        }
        if (this.adapter.centerManager.enabled) {
            return true
        }
        if (this.adapter.releaseManager.enabled) {
            return true
        }
        return this.adapter.viewManager.virtualSize > this.adapter.mainAxisSize
    }
    public get contentPosition() {
        return this.content.position[this.adapter.mainAxis]
    }
    protected onInit(): void {
        this._initView()
        this._initContent()
        this._parentAdapter = this.adapter.getParentAdapter(this.adapter.node.parent)
        this.view[ADAPTER] = true
        this.adapter.viewManager.on(ViewManager.Event.ON_UPDATE_VIEWS, this._onUpdateViews, this)
        this.adapter.viewManager.on(ViewManager.Event.ON_CHANGED_VIRTUALSIZE, this._onChangedVirtualSize, this)
        this.adapter.viewManager.on(ViewManager.Event.ON_CHANGED_OVERFLOWHEADER, this._onChangedOverflowHeader, this)
        this.adapter.viewManager.on(ViewManager.Event.ON_RESET_ALL_STATE, this._onResetAllState, this)
        this.adapter.viewManager.on(ViewManager.Event.ON_CLEARVIEWS, this._onResetAllState, this)
        this.adapter.node.on(cc.Node.EventType.SIZE_CHANGED, this._onAdapterSizeChanged, this)
        this.view.on(cc.Node.EventType.SIZE_CHANGED, this._onViewSizeChanged, this)
        this._registerTouchEvent()
        this.__createDebug()
        this.adapter.scheduleOnce(() => {
            this._updatePercentage()
        })
    }
    private _initView() {
        if (!this.view) {
            throw Error("ScrollManager view 参数为空！")
        }
        var anchorPoint = { x: 0.5, y: 0.5 }
        anchorPoint[this.adapter.mainAxis] = this.adapter.mainAxisAnchorPoint
        this.view.setAnchorPoint(anchorPoint.x, anchorPoint.y)
        var widget = this.view.getComponent(cc.Widget)
        if (!widget) {
            widget = this.view.addComponent(cc.Widget)
            widget.isAlignLeft = widget.isAlignRight = widget.isAlignTop = widget.isAlignBottom = true
            widget.left = widget.right = widget.top = widget.bottom = 0
        }
        widget.updateAlignment()
        this._viewWidget = widget
    }
    private __createDebug() {
        if (ADAPTER_DEBUG_CONTENT) {
            var obj = new cc.Node("__DEBUG_CONTENT_RECT__")
            obj.parent = this.view
            // obj.layer = this.view.node.layer
            this.__debug_graphics = obj.addComponent(cc.Graphics)
            this.__debug_graphics.lineWidth = DEBUG_DRAW_LIND_WIDTH
            this.__debug_graphics.fillColor = DEBUG_DRAW_FILL_COLOR
            this.__debug_graphics.strokeColor = DEBUG_DRAW_BORDER_COLOR
        }
    }
    private __drawDebug() {
        if (!this.__debug_graphics) return
        this.__debug_graphics.clear()
        var mainAxis = this.adapter.mainAxis
        var crossAxis = this.adapter.crossAxis
        var multiplier = this.adapter.multiplier
        var position = { x: 0, y: 0 }
        var size = { x: 0, y: 0 }
        size[mainAxis] = this.adapter.viewManager.virtualSize
        size[crossAxis] = this.adapter.crossAxisSize
        position[mainAxis] = this.contentPosition - (size[mainAxis] * this.content.getAnchorPoint()[mainAxis]) * multiplier
        position[mainAxis] += this.adapter.viewManager.overflowHeader
        position[crossAxis] -= size[crossAxis] * this.view.getAnchorPoint()[crossAxis]
        this.__debug_graphics.fillRect(position.x, position.y, size.x, size.y)
        this.__debug_graphics.stroke()
    }
    private _initContent() {
        if (!this.content) {
            throw Error("ScrollManager content 参数为空！")
        }
        this.content.setAnchorPoint(this.view.getAnchorPoint())
        var size = { x: 0, y: 0 }
        size[this.adapter.crossAxis] = Helper.sizeToVec(this.view.getContentSize())[this.adapter.crossAxis]
        this.content.setContentSize(size.x, size.y)
        if (!this._layerLowest) {
            this._layerLowest = new cc.Node("_layerLowest")
            this._layerMedium = new cc.Node("_layerMedium")
            this._layerHighest = new cc.Node("_layerHighest")
            this.content.addChild(this._layerLowest)
            this.content.addChild(this._layerMedium)
            this.content.addChild(this._layerHighest)
        }
        this._updateContentPosition({ x: 0, y: 0 })
    }
    private _registerTouchEvent() {
        this.view.on(cc.Node.EventType.TOUCH_START, this._onTouchStart, this, true)
        this.view.on(cc.Node.EventType.TOUCH_END, this._onTouchEnd, this, true)
        this.view.on(cc.Node.EventType.TOUCH_CANCEL, this._onTouchCancel, this, true)
        this.view.on(cc.Node.EventType.TOUCH_MOVE, this._onTouchMove, this, true)
    }
    private _bubbleToParent(event: cc.Event.EventTouch | cc.Event.EventMouse) {
        if (!this._parentAdapter) return
        this._parentAdapter.scrollManager.view.dispatchEvent(event)
    }
    private _emitCancelEvent(event: cc.Event.EventTouch) {
        if (this._isCanceledEvent) return
        const deltaMove = event.getLocation()
        deltaMove.subSelf(event.getStartLocation())
        if (this.cancelInnerEvents && deltaMove.mag() > 7) {
            if (event.target !== this.view) {
                this._simulateEvent(event, cc.Node.EventType.MOUSE_LEAVE)
                this._simulateEvent(event, cc.Node.EventType.TOUCH_CANCEL)
                this._isCanceledEvent = true
            }
        }
    }
    private _simulateEvent(event: cc.Event.EventTouch, type: string, isSimulate: boolean = true) {
        if (!event) return
        const _event: any = new cc.Event.EventTouch(event.getTouches(), event.bubbles)
        var target = event.target as Node
        _event.type = type
        _event.touch = event.touch
        _event.simulate = isSimulate
        target.dispatchEvent(_event)
    }
    private _onUpdateViews() {
        this._velocity = 0
        this._updatePercentage()
    }
    private _onChangedVirtualSize() {
        this._updatePercentage()
        if (this._scrollHandlePosition != null && this._scrollHandlePosition.change != null) {
            this._scrollHandlePosition.change()
        }
    }
    private _onChangedOverflowHeader(overflowHeader: number) {
        this.__drawDebug()
    }
    private _onResetAllState() {
        this._velocity = 0
        this._scrolling = false
        this._dragging = false
        this._isMyEventAndMoved = false
        this._scrollDirection = ScrollDirection.None
        this._percentage = 0
        this._isEmitAboutToStop = false
        this._boundaryOffset = 0
        this._isCanceledEvent = false
        this._parentTouch = false
        this._stopCheckNested = false
        this._scrollDirection = ScrollDirection.None
        this._touchEvent = null
        this.stopScroll()
        this._initView()
        this._initContent()
    }
    /** 当adapter尺寸改变时 更新 view 尺寸 这里手动更新的原因是Widget不会自动更新 ...  */
    private _onAdapterSizeChanged() {
        this._viewWidget.updateAlignment()
    }
    /** 当view尺寸改变时 */
    private _onViewSizeChanged() {
        this.emit(Event.ON_VIEW_SIZE_CHANGED)
    }
    /** 是否由我来处理触摸事件 */
    private _isMyEvent(event: cc.Event.EventTouch, useCaptures: cc.Node[]) {
        if (event.eventPhase == cc.Event.EventTouch.AT_TARGET || !useCaptures || useCaptures[0] == this.view && !event.target[ADAPTER]) {
            return true
        }
        return false
    }
    private _onTouchStart(event: cc.Event.EventTouch, useCaptures: cc.Node[]) {
        this._velocity = 0
        this._dragging = true
        this._isMyEventAndMoved = false
        this._isCanceledEvent = false
        this._parentTouch = false
        this._stopCheckNested = false
        this._isEmitAboutToStop = false
        this._scrollDirection = ScrollDirection.None
        this._contentStartPosition.set(this.content.position)
        this._touchEvent = event
        this.stopScroll()
        this._calcNestedDirection()
        this.emit(Event.ON_SCROLL_START)
    }
    private _onTouchEnd(event: cc.Event.EventTouch, useCaptures: cc.Node[]) {
        this._dragging = false
        this._touchEvent = null
        this.emit(Event.ON_SCROLL_END, event)
    }
    private _onTouchCancel(event: cc.Event.EventTouch, useCaptures: cc.Node[]) {
        if ((event as any).simulate) {
            return
        }
        this._dragging = false
        this._touchEvent = null
        this.emit(Event.ON_SCROLL_CANCEL, event)
    }
    private _onTouchMove(event: cc.Event.EventTouch, useCaptures: cc.Node[]) {
        if (!this._isMyEvent(event, useCaptures)) {
            return
        }
        // 取消Button事件
        this._emitCancelEvent(event)
        // 如果已经确定不能移动，直接抛给上层
        if (this._parentTouch || !this.canTouch) {
            return this._bubbleToParent(event)
        }
        // if (!this._touchEvent && this.adapter.centerManager.enabled) return
        if (!this._touchEvent) return
        var mainAxis = this.adapter.mainAxis
        var location = event.getLocation()
        var startLocation = event.getStartLocation()
        var pointerDelta = location.sub(startLocation)
        if (pointerDelta.equals(cc.v2())) {
            return
        }
        var position = { x: 0, y: 0 }
        position[mainAxis] = this._contentStartPosition[mainAxis] + pointerDelta[mainAxis]
        var delta = position[mainAxis] - this.contentPosition
        var offset = this.calcOffset(delta)
        var axis = this.adapter.isHorizontal ? -1 : 1
        position[mainAxis] += axis * offset
        if (this.movementType == MovementType.Elastic && offset != 0) {
            position[mainAxis] -= axis * this._rubberDelta(offset, this.adapter.mainAxisSize)
        }
        // 这里判断是否移动了 如果移动了 则停止向上传播
        this._checkNested(event, position, this._parentAdapter)
        if (this._parentTouch) {
            this._bubbleToParent(event)
        } else {
            this._isMyEventAndMoved = true
            this._updateContentPosition(position)
        }
    }
    private _calcNestedDirection() {
        if (!this._parentAdapter) return
        if (this.percentage <= this.nestedMinThreshold && !this.adapter.viewManager.loopHeader) {
            this._nestedDirection = this.adapter.multiplier == 1 ? NestedDirection.Footer : NestedDirection.Header
        } else if (this.percentage >= this.nestedMaxThreshold && !this.adapter.viewManager.loopFooter) {
            this._nestedDirection = this.adapter.multiplier == 1 ? NestedDirection.Header : NestedDirection.Footer
        } else {
            this._nestedDirection = NestedDirection.Both
        }
    }
    /** 当嵌套时 根据当前滑动方向 决定谁可以滑动，（自己 或 父级Adapter） */
    private _checkNested(event: cc.Event.EventTouch | cc.Event.EventMouse, position: ILike, adapter: ScrollAdapter) {
        if (!adapter || this._stopCheckNested) return
        // 同方向
        if (this.orientation == adapter.scrollManager.orientation) {
            var offset = position[this.adapter.mainAxis] - this._contentStartPosition[this.adapter.mainAxis]
            if (Math.abs(offset) <= 0.1) {
                return
            }
            if (this._nestedDirection == NestedDirection.Footer) {
                if (offset < 0) {
                    this._parentTouch = true
                }
            } else if (this._nestedDirection == NestedDirection.Header) {
                if (offset > 0) {
                    this._parentTouch = true
                }
            }
        } else {
            // 反方向
            var xOffset = 0, yOffset = 0
            if (event instanceof cc.Event.EventTouch) {
                var start = event.getStartLocation()
                var curre = event.getLocation()
                xOffset = Math.abs(start.x - curre.x)
                yOffset = Math.abs(start.y - curre.y)
            } else {
                xOffset = Math.abs(event.getScrollX())
                yOffset = Math.abs(event.getScrollY())
            }
            if (xOffset == yOffset) return
            if (xOffset > yOffset) {
                if (this.adapter.isVertical) {
                    this._parentTouch = true
                }
            } else if (yOffset > xOffset) {
                if (this.adapter.isHorizontal) {
                    this._parentTouch = true
                }
            }
        }
        if (!this._parentTouch && adapter.scrollManager.parentAdapter) {
            return this._checkNested(event, position, adapter.scrollManager.parentAdapter)
        }
        this._stopCheckNested = true
    }
    /** 更新content坐标 */
    private _updateContentPosition(position: ILike, updatePercentage: boolean = true) {
        this._updateScrollDirection(position)
        this.content.setPosition(position.x, position.y)
        this.emit(Event.ON_SCROLL, this._scrollDirection)
        // 这里顺序很重要 必须先发送滚动事件，然后再更新进度，否则可能内容还没有填充时 计算 this._calcOffset 会有偏移
        if (updatePercentage) {
            this._updatePercentage()
        } else {
            this.__drawDebug()
        }
    }
    /** 缓存当前content坐标 */
    private _updatePrevContentPosition() {
        this._prevContentPosition.set(this.content.position)
    }
    /**
     * 更新进度 难啃的骨头马勒戈壁
     */
    private _calcPercentage(contentPosition: number, offset: number) {
        var hiddenSize = this.internal_getHiddenSize()
        var loopHeader = this.adapter.viewManager.loopHeader
        var loopFooter = this.adapter.viewManager.loopFooter
        var multiplier = this.adapter.multiplier
        var overflowHeader = this.adapter.viewManager.overflowHeader
        var position = contentPosition * multiplier
        if (this.adapter.isHorizontal) {
            position -= offset * multiplier
        } else {
            position += offset * multiplier
        }
        if (loopFooter) {
            hiddenSize += this.adapter.viewManager.spacing
            position += (overflowHeader + hiddenSize * multiplier) * multiplier
            if (this.adapter.centerManager.enabled) {
                position += this.adapter.centerManager.getContainerOffset()
            } else {
                position += this.adapter.paddingHeader
            }
            position += 1
            position = position % hiddenSize
        } else if (loopHeader) {
            position += this.adapter.mainAxisSize - 1
            if (this.adapter.centerManager.enabled) {
                position -= this.adapter.centerManager.getContainerOffset()
            } else {
                position -= this.adapter.paddingFooter
            }
            position += (overflowHeader + hiddenSize * multiplier) * multiplier
            var ok = contentPosition * -multiplier > overflowHeader * multiplier
            if (ok) {
                position += this.adapter.viewManager.spacing
            }
            position = position % hiddenSize
        } else {
            position += overflowHeader * multiplier
            if (this.adapter.centerManager.enabled) {
                position += this.adapter.centerManager.getContainerOffset()
            } else {
                position += this.adapter.paddingHeader
            }
            if (position > hiddenSize) {
                position = hiddenSize
            }
        }
        return position / hiddenSize
    }
    private _updatePercentage() {
        var offset = this.calcOffset()
        if (this.adapter.viewManager.virtualSize <= this.adapter.mainAxisSize) {
            this._percentage = 0
        } else {
            this._percentage = this._calcPercentage(this.contentPosition, offset)
        }
        this.emit(Event.ON_UPDATE_PERCENTAGE, this._percentage, offset)
        this.__drawDebug()
    }
    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_disableTouchTarget(node: cc.Node) {
        // if (this.adapter.pageViewManager.enabled) return
        if (this._touchEvent && this._touchEvent.target.uuid == node.uuid) {
            var event = this._touchEvent
            this._simulateEvent(event, cc.Node.EventType.TOUCH_CANCEL, false)
            this._simulateEvent(event, cc.Node.EventType.MOUSE_LEAVE, false)
            this._touchEvent = null
        }
    }
    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_getHiddenSize() {
        var loopHeader = this.adapter.viewManager.loopHeader
        var loopFooter = this.adapter.viewManager.loopFooter
        var hiddenSize = this.adapter.viewManager.virtualSize
        if (!loopHeader && !loopFooter && !this.adapter.centerManager.enabled) {
            hiddenSize -= this.adapter.mainAxisSize
            hiddenSize += this.adapter.mainAxisPadding
        }
        return hiddenSize
    }

    private _getContentMinBoundaryOffset(delta: number, position: number) {
        if (!this.adapter.viewManager.header || !this.adapter.centerManager.enabled && this.adapter.viewManager.virtualSize <= this.adapter.mainAxisSize) {
            if (this.adapter.isHorizontal) {
                return position + this._defaultMax + delta
            } else {
                return position + this._defaultMin + delta
            }
        }
        return this.adapter.viewManager.min + delta
    }
    private _getContentMaxBoundaryOffset(delta: number, position: number) {
        if (!this.adapter.viewManager.header || !this.adapter.centerManager.enabled && this.adapter.viewManager.virtualSize <= this.adapter.mainAxisSize) {
            if (this.adapter.isHorizontal) {
                return position + this._defaultMin + delta
            } else {
                return position + this._defaultMax + delta
            }
        }
        return this.adapter.viewManager.max + delta
    }
    private _getMaxBoundaryOffset(max: number) {
        var viewMax = this._viewMax
        if (this.adapter.isHorizontal) {
            return this.adapter.isArrangeAxisStart ? max : viewMax + max
        } else {
            return this.adapter.isArrangeAxisStart ? -max : viewMax - max
        }
    }
    private _getMinBoundaryOffset(min: number) {
        var viewMin = this._viewMin
        if (this.adapter.isHorizontal) {
            return this.adapter.isArrangeAxisStart ? viewMin + min : min
        } else {
            return this.adapter.isArrangeAxisStart ? viewMin - min : -min
        }
    }
    private _rubberDelta(overStretching: number, viewSize: number): number {
        return (1 - (1 / ((Math.abs(overStretching) * 0.55 / viewSize) + 1))) * viewSize * Math.sign(overStretching)
    }
    private _calcElastic(deltaTime: number, offset: number, out: cc.Vec3) {
        var mainAxis = this.adapter.mainAxis
        var smoothTime = this.elasticity
        if (this._scrolling) {
            smoothTime *= 3
        }
        var axis = this.adapter.isHorizontal ? -1 : 1
        var { velocity, position } = Helper.smoothDamp(
            this.contentPosition,
            this.contentPosition + axis * offset,
            this._velocity,
            smoothTime,
            Helper.Infinity,
            deltaTime
        )
        if (Math.abs(velocity) < 1) {
            velocity = 0
        }
        this._velocity = velocity
        out[mainAxis] = position
    }
    private _calcInertia(deltaTime: number, out: cc.Vec3) {
        this._velocity *= Math.pow(this.decelerationRate, deltaTime)
        if (Math.abs(this._velocity) < 1) {
            this._velocity = 0
        }
        out[this.adapter.mainAxis] += this._velocity * deltaTime
    }
    private _calcClamped(out: cc.Vec3) {
        var mainAxis = this.adapter.mainAxis
        var boundary = out[mainAxis] - this.contentPosition
        var offset = this.calcOffset(boundary)
        if (this.adapter.isHorizontal) {
            out[mainAxis] -= offset
        } else {
            out[mainAxis] += offset
        }
    }
    private _updateScrollDirection(position: ILike) {
        var delta = position[this.adapter.mainAxis] - this.contentPosition
        if (delta == 0) {
            this._scrollDirection = ScrollDirection.None
            return
        }
        if (this.adapter.isHorizontal) {
            this._scrollDirection = delta > 0 ? ScrollDirection.Right : ScrollDirection.Left
        } else {
            this._scrollDirection = delta > 0 ? ScrollDirection.Up : ScrollDirection.Down
        }
        this._laseScrollDirection = this._scrollDirection
    }
    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_setContentPosition(mainPosition: number, updatePercentage: boolean = true) {
        var position = { x: 0, y: 0 }
        position[this.adapter.mainAxis] = mainPosition
        this._updateContentPosition(position, updatePercentage)
    }
    test = false
    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_lateUpdate(deltaTime: number) {
        if (this.test) return
        this._autoScrolling(deltaTime)
        this._scrollHandler(deltaTime, this._scrollHandlePosition, this._scrollPositionHandler.bind(this))
        this._scrollHandler(deltaTime, this._scrollHandlePercentage, this._scrollPercentageHandler.bind(this))
    }
    private _autoScrolling(deltaTime: number) {
        var offset = this.calcOffset()
        this._boundaryOffset = offset
        if (!this._dragging && (offset != 0 || this._velocity != 0)) {
            this.content.getPosition(_tempPosition)
            if (this.movementType == MovementType.Elastic && offset != 0) {
                this._calcElastic(deltaTime, offset, _tempPosition)
            } else if (this.inertia) {
                this._calcInertia(deltaTime, _tempPosition)
            } else {
                this._velocity = 0
            }
            if (this.movementType == MovementType.Clamped) {
                this._calcClamped(_tempPosition)
            }
            this._updateContentPosition(_tempPosition)
        }
        if (this._dragging && this.inertia) {
            var newVelocity = (this.contentPosition - this._prevContentPosition[this.adapter.mainAxis]) / deltaTime
            this._velocity = Helper.lerp(this._velocity, newVelocity, deltaTime * 10)
        }
        if (!this._prevContentPosition.equals(this.content.position)) {
            this._updatePrevContentPosition()
        }
        if (!this._isEmitAboutToStop && !this._dragging && Math.abs(this._velocity) <= this.aboutToStopVelocity) {
            if (!this._scrollHandlePercentage && !this._scrollHandlePosition) {
                this.emit(Event.ON_ABOUT_TO_STOP, this._velocity)
                this._isEmitAboutToStop = true
            }
        }
        this._scrolling = false
    }
    private _scrollHandler(deltaTime: number, info: IScrollHandle, handler: Function) {
        if (info == null) return
        info.deltaTime += deltaTime
        var time = info.deltaTime / (info.duration > cc.macro.FLT_EPSILON ? info.duration : cc.macro.FLT_EPSILON)
        time = Helper.clamp01(time)
        var easingTime = cc.easing.quintOut(time)
        info.current = Helper.progress(info.from, info.to, info.current, easingTime)
        handler(info, time)
    }
    private _scrollPercentageHandler(info: IScrollHandle, time: number) {
        var old = this.percentage
        this.setPercentage(info.current)
        if (time == 1 || old == this.percentage) {
            var stop = true
            if (this._scrollHandlePercentage.stop) {
                stop = this._scrollHandlePercentage.stop()
            }
            if (stop) {
                this._scrollHandlePercentage = null
            }
        }
    }
    private _scrollPositionHandler(info: IScrollHandle, time: number) {
        var position = { x: 0, y: 0 }
        position[this.adapter.mainAxis] = info.current
        this._setAutoScroll(position)
        if (time == 1 || Math.abs(this.contentPosition - info.to) <= 0.0001) {
            if (this._scrollHandlePosition.stop) {
                this._scrollHandlePosition.stop()
            }
            this._scrollHandlePosition = null
        }
    }
    private _setAutoScroll(position: ILike) {
        const handler = (target: ILike) => {
            this._updateContentPosition(target)
            this._updatePrevContentPosition()
            this._velocity = 0
        }
        handler(position)
        var offset = this.calcOffset()
        if (offset != 0) {
            var direction = this.adapter.isHorizontal ? -1 : 1
            position[this.adapter.mainAxis] += offset * direction
            handler(position)
            return false
        }
        return true
    }
    private _scrollToPosition(duration: number, getPosition: () => number, onStop: Function): boolean {
        if (!this.canAutoScroll) {
            return false
        }
        var position = getPosition()
        if (position == null || Math.abs(this.contentPosition - position) < cc.macro.FLT_EPSILON) {
            return false
        }
        this._scrollHandlePercentage = null
        this._scrollHandlePosition = {
            current: 0,
            from: this.contentPosition,
            to: position,
            deltaTime: 0,
            duration: Math.max(0, duration),
            change: () => {
                position = getPosition()
                this._scrollHandlePosition.to = position
            },
            stop: () => {
                onStop()
            }
        }
        return true
    }
    // public 
    public getLayerNode(layer: Layer): cc.Node {
        switch (layer) {
            case Layer.Medium:
                return this._layerMedium
            case Layer.Highest:
                return this._layerHighest
            default:
                return this._layerLowest
        }
    }
    /**
     * 滚动到数据索引位置   
     * @param duration 滚动时长
     * @param index 数据索引
     * @param alwaysScroll 滚动方向，默认 AlwaysScroll.Auto
     */
    public scrollToModelIndex(duration: number, index: number, alwaysScroll?: AlwaysScroll) {
        var groupIndex = this.adapter.viewManager.getGroupIndexByModelIndex(index)
        if (-1 == groupIndex) return
        var priorityCheckExists = false
        var ok = this._scrollToPosition(duration, () => {
            var position = this.adapter.centerManager.getPositionByGroupIndex(groupIndex, alwaysScroll, priorityCheckExists)
            priorityCheckExists = true
            return position
        }, () => {
            this.emit(Event.ON_SCROLL_TO_MODELINDEX_AFTER, index)
        })
        if (ok) {
            this.emit(Event.ON_SCROLL_TO_MODELINDEX_BEFOR, index)
        }
    }
    /**
     * 滚动到指定单行索引位置
     * @param duration 滚动时长
     * @param index 单行索引
     * @param alwaysScroll 滚动方向，默认 AlwaysScroll.Auto
     */
    public scrollToGroupIndex(duration: number, index: number, alwaysScroll?: AlwaysScroll) {
        var priorityCheckExists = false
        var ok = this._scrollToPosition(duration, () => {
            var position = this.adapter.centerManager.getPositionByGroupIndex(index, alwaysScroll, priorityCheckExists)
            priorityCheckExists = true
            return position
        }, () => {
            this.emit(Event.ON_SCROLL_TO_GROUPINDEX_AFTER, index)
        })
        if (ok) {
            this.emit(Event.ON_SCROLL_TO_GROUPINDEX_BEFOR, index)
        }
    }
    /**
     * 滚动到数据头部
     * @param duration 滚动时间
     */
    public scrollToHeader(duration: number) {
        this.scrollToGroupIndex(duration, 0)
    }
    /**
     * 滚动到数据尾部
     * @param duration 滚动时间 
     */
    public scrollToFooter(duration: number) {
        this.scrollToGroupIndex(duration, this.adapter.viewManager.groupLength - 1)
    }
    /**
     * 滚动到指定百分比位置
     * 注意！如果你的item在滚动过程中会实时修改主轴尺寸，则不建议使用百分比来定位，请使用索引定位滚动 scrollToGroupIndex
     * 这是因为在滚动时如果主轴尺寸变化会改变运行时百分比，导致某些情况下可能永远也无法达到你指定的百分比位置
     * 如果你的item不会在滚动过程中改变主轴尺寸，那么请随意使用，不会有任何问题
     * @param duration 滚动时长
     * @param percentage 百分比 0-1
     */
    public scrollToPercentage(duration: number, percentage: number) {
        if (!this.canAutoScroll) {
            return false
        }
        if (Math.abs(this._percentage - percentage) < 0.001) {
            return
        }
        percentage = Helper.clamp01(percentage)
        duration = Math.max(0, duration)
        this._scrollHandlePercentage = null
        this._scrollHandlePercentage = {
            deltaTime: 0,
            duration: duration,
            current: 0,
            from: this._percentage,
            to: percentage,
        }
    }
    public stopVelocity() {
        this._velocity = 0
    }
    /** 停止所有自动滚动 */
    public stopScroll() {
        this._scrollHandlePosition = null
        this._scrollHandlePercentage = null
        this.stopVelocity()
    }
    public setPercentage(percentage: number) {
        var hiddenSize = this.internal_getHiddenSize()
        var position = { x: 0, y: 0 }
        var total = 0
        var old = null
        // TODO 最大循环100次 防止死循环
        while (/** true **/ total < 100) {
            total++
            var cross = this._percentage - percentage
            if (old != null && this._percentage === old) {
                break
            }
            if (Math.abs(cross) < cc.macro.FLT_EPSILON) {
                break
            }
            old = this._percentage
            var target = this.contentPosition - cross * this.adapter.multiplier * hiddenSize
            position[this.adapter.mainAxis] = target
            var ok = this._setAutoScroll(position)
            if (!ok) {
                break
            }
        }
        if (total == 100) {
            console.warn("循环次数已达最大值，尽量不要在滚动过程中频繁修改尺寸")
        }
    }
    /** 计算overflow偏移量 */
    public calcOffset(delta: number = 0, position: number = this.contentPosition) {
        var offset = 0
        if (this.movementType == MovementType.Unrestricted) {
            return offset
        }
        var max = this._getContentMaxBoundaryOffset(delta, position)
        var min = this._getContentMinBoundaryOffset(delta, position)
        var maxOffset = this._getMaxBoundaryOffset(max)
        var minOffset = this._getMinBoundaryOffset(min)
        if (!this.adapter.centerManager.enabled && this.adapter.viewManager.virtualSize > this.adapter.mainAxisSize) {
            if (this.adapter.isVertical) {
                maxOffset -= this.adapter.viewManager.top
                minOffset += this.adapter.viewManager.bottom
            } else {
                maxOffset -= this.adapter.viewManager.left
                minOffset += this.adapter.viewManager.right
            }
        }
        var minExpand = 0, maxExpand = 0
        if (this.adapter.centerManager.enabled && this.adapter.viewManager.groupLength > 0) {
            maxExpand = this.adapter.centerManager.max
            minExpand = this.adapter.centerManager.min
        } else {
            var magneticOffset = this.adapter.viewManager.getMagneticOffset()
            maxOffset -= magneticOffset
            minOffset -= magneticOffset
        }
        if (this.adapter.releaseManager.enabled) {
            maxExpand = Math.max(maxExpand, this.adapter.releaseManager.max)
            minExpand = Math.max(minExpand, this.adapter.releaseManager.min)
        }
        maxOffset -= maxExpand
        minOffset += minExpand
        if (minOffset < -0.001) {
            offset = minOffset
        } else if (maxOffset > 0.001) {
            offset = maxOffset
        }
        return offset
    }
}