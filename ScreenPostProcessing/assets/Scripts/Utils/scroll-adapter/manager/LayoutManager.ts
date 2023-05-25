// import { _decorator, Component, Node } from 'cc';
import { Group } from '../abstract/Group';
import { Manager } from '../abstract/Manager';
import { ChildAlignment, Orientation } from '../define/enum';
import { IElement, IModel } from '../define/interface';
import { Helper } from '../help/helper';
const { ccclass, property } = cc._decorator;
enum Event {
    ON_LAYOUT_COMPLATED,
    ON_CHANGED_LAYOUT_STATE,
}
@ccclass('LayoutManager')
export class LayoutManager extends Manager {
    public static Event = Event
    @property({ type: ChildAlignment }) private _childAlignment: ChildAlignment = ChildAlignment.UpperLeft
    @property({
        type: ChildAlignment,
        tooltip: "布局元素的对齐方式"
    }) public get childAlignment() { return this._childAlignment }
    public set childAlignment(value: ChildAlignment) {
        if (value == this._childAlignment) return
        this._childAlignment = value
        this.emit(Event.ON_CHANGED_LAYOUT_STATE)
    }

    @property() private _spacing: number = 0
    @property({
        tooltip: "元素交叉轴布局的间距"
    }) get spacing() { return this._spacing }
    public set spacing(value: number) {
        if (value == this._spacing) return
        this._spacing = value
        this.emit(Event.ON_CHANGED_LAYOUT_STATE)
    }

    @property() private _reverseArrangement: boolean = false
    @property({
        tooltip: "反转布局"
    }) get reverseArrangement() { return this._reverseArrangement }
    set reverseArrangement(value: boolean) {
        if (value == this._reverseArrangement) return
        this._reverseArrangement = value
        this.emit(Event.ON_CHANGED_LAYOUT_STATE)
    }
    @property({
        tooltip: "延迟布局，开启后会统一在下一帧布局，建议开启"
    }) delayLayout: boolean = true
    @property() private _forceExpandWidth: boolean = false
    @(property as any)({
        group: { id: "0", name: "forceExpand" },
        tooltip: "是否强制布局元素宽度扩展以填充额外的可用空间"
    }) get forceExpandWidth() { return this._forceExpandWidth }
    public set forceExpandWidth(value: boolean) {
        if (value == this._forceExpandWidth) return
        this._forceExpandWidth = value
        this.emit(Event.ON_CHANGED_LAYOUT_STATE)
    }
    @property() private _forceExpandHeight: boolean = true
    @(property as any)({
        group: { id: "0", name: "forceExpand" },
        tooltip: "是否强制布局元素高度扩展以填充额外的可用空间"
    }) get forceExpandHeight() { return this._forceExpandHeight }
    public set forceExpandHeight(value: boolean) {
        if (value == this._forceExpandHeight) return
        this._forceExpandHeight = value
        this.emit(Event.ON_CHANGED_LAYOUT_STATE)
    }
    @property() private _controlSizeWidth: boolean = false
    @(property as any)({
        group: { id: "0", name: "controlSize" },
        tooltip: "如果设置为 false，布局只会影响元素的位置，而不会影响宽度，在这种情况下你可以设置元素的宽度\n如果设置为 true，元素的宽度将由布局根据它们各自的 IElement.minSize、IElement.preferredSize、IElement.flexibleSize自动设置。如果元素的宽度应根据可用空间的大小而变化，应开启此功能。在这种情况下不能直接设置每个元素的宽度，但可以通过控制每个元素的IElement.minSize、IElement.preferredSize、IElement.flexibleSize来进行控制"
    }) get controlSizeWidth() { return this._controlSizeWidth }
    public set controlSizeWidth(value: boolean) {
        if (value == this._controlSizeWidth) return
        this._controlSizeWidth = value
        this.emit(Event.ON_CHANGED_LAYOUT_STATE)
    }
    @property() private _controlSizeHeight: boolean = false
    @(property as any)({
        group: { id: "0", name: "controlSize" },
        tooltip: "如果设置为 false，布局只会影响元素的位置，而不会影响高度，在这种情况下你可以设置元素的高度\n如果设置为 true，元素的高度将由布局根据它们各自的 IElement.minSize、IElement.preferredSize、IElement.flexibleSize自动设置。如果元素的高度应根据可用空间的大小而变化，应开启此功能。在这种情况下不能直接设置每个元素的高度，但可以通过控制每个元素的IElement.minSize、IElement.preferredSize、IElement.flexibleSize来进行控制"
    }) get controlSizeHeight() { return this._controlSizeHeight }
    public set controlSizeHeight(value: boolean) {
        if (value == this._controlSizeHeight) return
        this._controlSizeHeight = value
        this.emit(Event.ON_CHANGED_LAYOUT_STATE)
    }
    @property() private _controlScaleWidth: boolean = false
    @(property as any)({
        group: { id: "0", name: "controlScale" },
        tooltip: "是否使用 x 缩放计算宽度"
    }) get controlScaleWidth() { return this._controlScaleWidth }
    public set controlScaleWidth(value: boolean) {
        if (value == this._controlScaleWidth) return
        this._controlScaleWidth = value
        this.emit(Event.ON_CHANGED_LAYOUT_STATE)
    }
    @property() private _controlScaleHeight: boolean = false
    @(property as any)({
        group: { id: "0", name: "controlScale" },
        tooltip: "是否使用 y 缩放计算高度"
    }) get controlScaleHeight() { return this._controlScaleHeight }
    public set controlScaleHeight(value: boolean) {
        if (value == this._controlScaleHeight) return
        this._controlScaleHeight = value
        this.emit(Event.ON_CHANGED_LAYOUT_STATE)
    }

    private _isDirty: boolean = false
    private _layoutQueue: Group<any>[] = []

    public get top() {
        if (this.adapter.isVertical) return 0
        return this.adapter.viewManager.top
    }
    public get bottom() {
        if (this.adapter.isVertical) return 0
        return this.adapter.viewManager.bottom
    }
    public get left() {
        if (this.adapter.isHorizontal) return 0
        return this.adapter.viewManager.left
    }
    public get right() {
        if (this.adapter.isHorizontal) return 0
        return this.adapter.viewManager.right
    }
    public get horizontal() {
        return this.left + this.right
    }
    public get vertical() {
        return this.top + this.bottom
    }
    public get isControlMainAxisSize() {
        return this.adapter.isHorizontal && this.controlSizeWidth || this.adapter.isVertical && this.controlSizeHeight
    }
    public get isControlCrossAxisSize() {
        return this.adapter.isHorizontal && this.controlSizeHeight || this.adapter.isVertical && this.controlSizeWidth
    }
    public get isControlCrossAxisScale() {
        return this.adapter.isHorizontal && this.controlScaleHeight || this.adapter.isVertical && this.controlScaleWidth
    }
    protected onInit(): void {
    }
    public layout(group: Group<any>) {
        if (!group) return
        if (this.delayLayout) {
            this.unLayout(group.index)
            this._layoutQueue.push(group)
            this._isDirty = true
        } else {
            this._layoutHandler(group)
            this.emit(Event.ON_LAYOUT_COMPLATED, [group.index])
        }
    }
    public unLayout(index: number) {
        var index = this._layoutQueue.findIndex(item => item.index == index)
        if (-1 != index) {
            this._layoutQueue.splice(index, 1)
        }
    }
    private _layoutHandler(group: Group<any>) {
        this._calcAlongAxis(group, Orientation.Horizontal, this.adapter.isHorizontal)
        this._setChildrenAlongAxis(group, Orientation.Horizontal, this.adapter.isHorizontal)
        this._calcAlongAxis(group, Orientation.Vertical, this.adapter.isHorizontal)
        this._setChildrenAlongAxis(group, Orientation.Vertical, this.adapter.isHorizontal)
    }
    private _calcAlongAxis(group: Group<any>, axis: Orientation, isVertical: boolean): void {
        var combinedPadding = (axis == Orientation.Horizontal ? this.horizontal : this.vertical)
        var controlSize = this._getControlSize(axis)
        var controlScale = this._getControlScale(axis)
        var forceExpand = this._getForceExpandSize(axis)
        var totalMin = combinedPadding
        var totalPreferred = combinedPadding
        var totalFlexible = 0
        var alongOtherAxis = isVertical != (axis == Orientation.Vertical)
        var layoutList = this._getLayoutList(group.models)
        for (let i = 0; i < layoutList.length; i++) {
            const model = layoutList[i];
            var { min, preferred, flexible } = this._getChildSizes(model, axis, controlSize, forceExpand)
            if (controlScale) {
                var scaleFactor = model.scale[this._getAxis(axis)]
                min *= scaleFactor
                preferred *= scaleFactor
                flexible *= scaleFactor
            }
            if (alongOtherAxis) {
                totalMin = Math.max(min + combinedPadding, totalMin)
                totalPreferred = Math.max(preferred + combinedPadding, totalPreferred)
                totalFlexible = Math.max(flexible, totalFlexible)
            } else {
                totalMin += min + this.spacing
                totalPreferred += preferred + this.spacing
                totalFlexible += flexible
            }
        }
        if (!alongOtherAxis && layoutList.length > 0) {
            totalMin -= this.spacing
            totalPreferred -= this.spacing
        }
        totalPreferred = Math.max(totalMin, totalPreferred)
        this._setLayoutInputForAxis(group, totalMin, totalPreferred, totalFlexible, axis)
    }
    private _getControlSize(axis: Orientation) {
        return axis == Orientation.Horizontal ? this.controlSizeWidth : this.controlSizeHeight
    }
    private _getControlScale(axis: Orientation) {
        return axis == Orientation.Horizontal ? this.controlScaleWidth : this.controlScaleHeight
    }
    private _getForceExpandSize(axis: Orientation) {
        return axis == Orientation.Horizontal ? this.forceExpandWidth : this.forceExpandHeight
    }
    private _setChildrenAlongAxis(group: Group<any>, axis: Orientation, isVertical: boolean): void {
        var size = group.size[this._getAxis(axis)]
        var controlSize = this._getControlSize(axis)
        var controlScale = this._getControlScale(axis)
        var forceExpand = this._getForceExpandSize(axis)
        var alignmentOnAxis = this._getAlignmentOnAxis(axis)
        var layoutList = this._getLayoutList(group.models)
        var alongOtherAxis = isVertical != (axis == Orientation.Vertical)
        var startIndex = this.reverseArrangement ? layoutList.length - 1 : 0
        var endIndex = this.reverseArrangement ? 0 : layoutList.length
        var increment = this.reverseArrangement ? -1 : 1
        var key = this._getAxis(axis)
        if (alongOtherAxis) {
            var innerSize = size - (axis == Orientation.Horizontal ? this.horizontal : this.vertical)
            for (var i = startIndex; this.reverseArrangement ? i >= endIndex : i < endIndex; i += increment) {
                const model = layoutList[i]
                var { min, preferred, flexible } = this._getChildSizes(model, axis, controlSize, forceExpand)
                let scaleFactor = controlScale ? model.scale[key] : 1
                var requiredSpace = Helper.clamp(innerSize, min, flexible > 0 ? size : preferred)
                var startOffset = this._getStartOffset(group, axis, requiredSpace * scaleFactor)
                if (controlSize) {
                    this._setChildAlongAxisWithScale(group, model, axis, startOffset, scaleFactor, requiredSpace)
                } else {
                    var offsetInCell = (requiredSpace - model.size[key]) * alignmentOnAxis
                    offsetInCell *= scaleFactor
                    this._setChildAlongAxisWithScale(group, model, axis, startOffset + offsetInCell, scaleFactor)
                }
            }
        } else {
            var pos = (axis == Orientation.Horizontal ? this.left : this.top)
            var itemFlexibleMultiplier = 0
            var surplusSpace = size - this._getTotalPreferredSize(group, axis)
            if (surplusSpace > 0) {
                if (this._getTotalFlexibleSize(group, axis) == 0) {
                    pos = this._getStartOffset(group, axis, this._getTotalPreferredSize(group, axis) - (axis == Orientation.Horizontal ? this.horizontal : this.vertical))
                }
                else if (this._getTotalFlexibleSize(group, axis) > 0) {
                    itemFlexibleMultiplier = surplusSpace / this._getTotalFlexibleSize(group, axis)
                }
            }
            var minMaxLerp = 0
            if (this._getTotalMinSize(group, axis) != this._getTotalPreferredSize(group, axis)) {
                minMaxLerp = Helper.clamp01((size - this._getTotalMinSize(group, axis)) / (this._getTotalPreferredSize(group, axis) - this._getTotalMinSize(group, axis)))
            }
            for (var i = startIndex; this.reverseArrangement ? i >= endIndex : i < endIndex; i += increment) {
                var model = layoutList[i]
                var { min, preferred, flexible } = this._getChildSizes(model, axis, controlSize, forceExpand)
                let scaleFactor = controlScale ? model.scale[key] : 1
                var childSize = Helper.lerp(min, preferred, minMaxLerp)
                childSize += flexible * itemFlexibleMultiplier
                if (controlSize) {
                    this._setChildAlongAxisWithScale(group, model, axis, pos, scaleFactor, childSize)
                }
                else {
                    var offsetInCell = (childSize - model.size[key]) * alignmentOnAxis
                    this._setChildAlongAxisWithScale(group, model, axis, pos + offsetInCell, scaleFactor)
                }
                pos += childSize * scaleFactor + this.spacing
            }
        }
    }
    private _setChildAlongAxisWithScale(group: Group<any>, model: IModel<any>, axis: Orientation, pos: number, scaleFactor: number, size?: number) {
        if (model == null) return
        const key = this._getAxis(axis)
        var layoutSize = 0
        if (!isNaN(size)) {
            model.layoutSize[key] = size
            layoutSize = size
        } else {
            layoutSize = model.size[key]
        }
        var position = { x: model.position.x, y: model.position.y }
        var value = 0
        if (axis == Orientation.Horizontal) {
            value = pos + layoutSize * model.anchorPoint[key] * scaleFactor
            value -= group.size[key] * group.anchorPoint[key]
            value += group.position[key]
        } else {
            value = -pos - layoutSize * (1 - model.anchorPoint[key]) * scaleFactor
            value += group.size[key] * (1 - group.anchorPoint[key])
            value += group.position[key]
        }
        position[key] = value
        model.position = position
    }

    private _getStartOffset(group: Group<any>, axis: Orientation, requiredSpaceWithoutPadding: number): number {
        var requiredSpace = requiredSpaceWithoutPadding + (axis == Orientation.Horizontal ? this.horizontal : this.vertical)
        var availableSpace = group.size[this._getAxis(axis)]
        var surplusSpace = availableSpace - requiredSpace
        var alignmentOnAxis = this._getAlignmentOnAxis(axis)
        return (axis == Orientation.Horizontal ? this.left : this.top) + surplusSpace * alignmentOnAxis
    }
    private _setLayoutInputForAxis(group: Group<any>, totalMin: number, totalPreferred: number, totalFlexible: number, axis: Orientation) {
        var key = this._getAxis(axis)
        group.totalMinSize[key] = totalMin
        group.totalPreferredSize[key] = totalPreferred
        group.totalFlexibleSize[key] = totalFlexible
    }
    private _getAxis(axis: Orientation) {
        return axis == Orientation.Horizontal ? "x" : "y"
    }
    private _getMinSize(element: IElement, axis: Orientation): number {
        return element.minSize[this._getAxis(axis)]
    }
    private _getPreferredSize(element: IElement, axis: Orientation): number {
        var key = this._getAxis(axis)
        return Math.max(element.minSize[key], element.preferredSize[key])
    }
    private _getFlexibleSize(element: IElement, axis: Orientation): number {
        return element.flexibleSize[this._getAxis(axis)]
    }
    private _getTotalMinSize(group: Group<any>, axis: Orientation): number {
        return group.totalMinSize[this._getAxis(axis)]
    }
    private _getTotalPreferredSize(group: Group<any>, axis: Orientation): number {
        return group.totalPreferredSize[this._getAxis(axis)]
    }
    private _getTotalFlexibleSize(group: Group<any>, axis: Orientation): number {
        return group.totalFlexibleSize[this._getAxis(axis)]
    }
    private _getChildSizes(model: IModel<any>, axis: Orientation, controlSize: boolean, childForceExpand: boolean) {
        var min, preferred, flexible
        if (!controlSize) {
            min = model.size[this._getAxis(axis)]
            preferred = min
            flexible = 0
        }
        else {
            min = this._getMinSize(model.element, axis)
            preferred = this._getPreferredSize(model.element, axis)
            flexible = this._getFlexibleSize(model.element, axis)
        }
        if (childForceExpand) {
            flexible = Math.max(flexible, 1)
        }
        return { min, preferred, flexible }
    }
    private _getAlignmentOnAxis(axis: Orientation) {
        if (axis == Orientation.Horizontal) {
            return (this.adapter.layoutManager.childAlignment % 3) * 0.5
        } else {
            return Math.floor(this.adapter.layoutManager.childAlignment / 3) * 0.5
        }
    }
    private _getLayoutList(models: IModel<any>[]) {
        var list = []
        for (let i = 0; i < models.length; i++) {
            const model = models[i];
            if (model.element.ignoreLayout) continue
            list.push(model)
        }
        return list
    }
    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_lateUpdate(deltaTime: number) {
        if (this._isDirty) {
            this._isDirty = false
            var complatedIndexs = []
            while (this._layoutQueue.length > 0) {
                var item = this._layoutQueue.shift()
                this._layoutHandler(item)
                complatedIndexs.push(item.index)
            }
            if (complatedIndexs.length > 0) {
                this.emit(Event.ON_LAYOUT_COMPLATED, complatedIndexs)
            }
        }
    }
}

