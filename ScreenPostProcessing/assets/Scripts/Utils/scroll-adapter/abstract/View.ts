import { ADAPTER_DEBUG_VIEW, DEBUG_DRAW_LIND_WIDTH, DEBUG_DRAW_LINE_COLOR } from '../define/debug';
import { Layer, WrapMode } from '../define/enum';
import { IElement, IModel, ILike } from '../define/interface';
import { Helper } from '../help/helper';
import { LayoutManager } from '../manager/LayoutManager';
import { ScrollManager } from '../manager/ScrollManager';
import { ViewManager } from '../manager/ViewManager';
import { Group } from './Group';
import { Holder } from './Holder';
import { ScrollAdapter } from './ScrollAdapter';
const { ccclass, property } = cc._decorator;
// @ccclass
export abstract class View<T = any, A extends ScrollAdapter = ScrollAdapter<T>> {
    protected abstract onVisible(): void
    protected abstract onDisable(): void
    private __debug_graphics: cc.Graphics
    private _adapter: A
    private _total: number = 0
    private _innerSize: number = 0
    private _group: Group<T, A> = null
    private _holderList: Holder<T, A>[] = []
    private _tempHolderList: { holder: Holder, model: IModel<T>, isNew: boolean }[] = []
    private _isOverflowFixed: boolean
    public get isOverflowFixed() { return this._isOverflowFixed }
    public get adapter() { return this._adapter }
    public get group() { return this._group }
    public get holderList() { return this._holderList }
    public get index() {
        if (!this.group) return -1
        return this.group.index
    }
    constructor(adapter: A) {
        this._adapter = adapter
        this.internal_reset()
        this.__createDebug()
    }
    private __createDebug() {
        if (ADAPTER_DEBUG_VIEW) {
            var obj = new cc.Node("__DEBUG_VIEW_RECT__")
            obj.parent = this.adapter.scrollManager.content
            // obj.layer = this.adapter.scrollManager.content.node.layer
            this.__debug_graphics = obj.addComponent(cc.Graphics)
            this.__debug_graphics.lineWidth = DEBUG_DRAW_LIND_WIDTH
            this.__debug_graphics.strokeColor = DEBUG_DRAW_LINE_COLOR
        }
    }
    private __drawDebug() {
        if (!this.__debug_graphics || !this.group) return
        this.__debug_graphics.clear()
        // if (this.index != 0) return
        var mainAxis = this.adapter.mainAxis
        var crossAxis = this.adapter.crossAxis
        var position = { x: 0, y: 0 }
        var size = { x: this.group.size.x, y: this.group.size.y }
        var anchor = { x: this.group.anchorPoint.x, y: this.group.anchorPoint.y }
        position[mainAxis] = this.group.position[mainAxis] - size[mainAxis] * anchor[mainAxis]
        position[mainAxis] += DEBUG_DRAW_LIND_WIDTH * 0.5
        position[crossAxis] = this.group.position[crossAxis] - size[crossAxis] * (1 - anchor[crossAxis])
        position[crossAxis] += DEBUG_DRAW_LIND_WIDTH * 0.5
        size[mainAxis] -= DEBUG_DRAW_LIND_WIDTH
        size[crossAxis] -= DEBUG_DRAW_LIND_WIDTH
        this.__debug_graphics.roundRect(position.x, position.y, size.x, size.y, 2)
        this.__debug_graphics.stroke()
    }

    public getFixedHolders(): Holder<T, A>[] {
        if (!this.group.isFixed) return []
        var list: Holder<T, A>[] = []
        var length = this.holderList.length
        for (let i = 0; i < length; i++) {
            const holder: Holder<T, A> = this.holderList[i];
            if (holder.model.element.fixed) {
                list.push(holder)
            }
        }
        return list
    }

    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_isWrap(model: IModel<T>, group: Group<T>): boolean {
        var wrap = false
        var prev = group && group.models[group.models.length - 1]
        if (prev) { //当前view为空 所以无论什么设置都不换行
            switch (model.element.wrapBeforeMode) {
                case WrapMode.Wrap:
                    wrap = true
                    break
                case WrapMode.Nowrap:
                    // 判断前一个是否允许在其后排列
                    wrap = prev.element.wrapAfterMode == WrapMode.Wrap
                    break
                case WrapMode.Auto:
                    wrap = prev.element.wrapAfterMode == WrapMode.Wrap
                    if (!wrap) { //前一个允许排列其后，计算是否已填满
                        wrap = this._calculateInnerSize(model, group)
                    }
                    break
            }
        }
        return wrap
    }
    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_reset() {
        this._group = null
        this._innerSize = 0
        this._total = 0
        this._holderList.length = 0
        this._isOverflowFixed = true
        this._tempHolderList.length = 0
        if (this.__debug_graphics) {
            this.__debug_graphics.clear()
        }
    }
    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_push(model: IModel<T>) {
        this._total++
        var mainAxis = this.adapter.mainAxis
        var crossAxis = this.adapter.crossAxis
        if (!model.element.ignoreLayout || model.element.ignoreLayout && model.element.placeholder) {
            if (this._innerSize != 0) {
                this._innerSize += this.adapter.layoutManager.spacing
            }
            this._innerSize += model.size[crossAxis]
        }
    }
    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_recycleHolders(done: (holder: Holder) => void) {
        for (let i = 0; i < this._holderList.length; i++) {
            const holder = this._holderList[i];
            holder.internal_disable()
            done(holder)
        }
        this._holderList.length = 0
    }
    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_preVisible(group: Group<T, A>, findHolder?: (model: IModel<T>) => Holder<T, A>) {
        this._group = group
        this._createHolders(findHolder)
        return this
    }
    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_visible() {
        this.register()
        for (let i = 0; i < this._tempHolderList.length; i++) {
            const { holder, model, isNew } = this._tempHolderList[i];
            holder.internal_visible(this, model, isNew)
        }
        this._tempHolderList.length = 0
        this.adapter.layoutManager.layout(this.group)
        this.onVisible()
    }
    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_disable() {
        this.adapter.layoutManager.unLayout(this.index)
        this.unregister()
        this.onDisable()
        this.internal_reset()
    }
    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_holderChanged(isMainAxisEqual: boolean) {
        var layoutSelf = true
        var mainAxis = this.adapter.mainAxis
        var oldMainAxisSize = this.group.size[mainAxis]
        if (!isMainAxisEqual) {
            var size = 0
            for (let i = 0; i < this.group.models.length; i++) {
                const model = this.group.models[i];
                var mainAxisSize = model.size[mainAxis]
                if (this.adapter.isVertical && this.adapter.layoutManager.controlScaleHeight
                    || this.adapter.isHorizontal && this.adapter.layoutManager.controlScaleWidth) {
                    mainAxisSize *= model.scale[mainAxis]
                }
                size = Math.max(size, mainAxisSize)
            }
            if (!Helper.approximately(this.group.size[mainAxis], size)) {
                this.group.oldSize[mainAxis] = this.group.size[mainAxis]
                this.group.size[mainAxis] = size
                layoutSelf = false
            }
        }
        if (layoutSelf) {
            // 交叉轴改变 不影响主轴 只布局自己
            this.adapter.layoutManager.layout(this.group)
        } else {
            // 主轴改变 交给viewManager来重新计算所有受影响的view
            this.adapter.viewManager.internal_viewChanged(this, oldMainAxisSize)
        }
    }
    private register() {
        this.adapter.viewManager.on(ViewManager.Event.ON_SCROLL, this._onScroll, this)
        this.adapter.viewManager.on(ViewManager.Event.ON_LATEUPDATE, this._onLateUpdate, this)
        this.adapter.layoutManager.on(LayoutManager.Event.ON_LAYOUT_COMPLATED, this._onLayoutComplated, this)
        this.adapter.layoutManager.on(LayoutManager.Event.ON_CHANGED_LAYOUT_STATE, this._onChangedLayoutState, this)
    }
    private unregister() {
        this.adapter.viewManager.off(ViewManager.Event.ON_SCROLL, this._onScroll, this)
        this.adapter.viewManager.off(ViewManager.Event.ON_LATEUPDATE, this._onLateUpdate, this)
        this.adapter.layoutManager.off(LayoutManager.Event.ON_LAYOUT_COMPLATED, this._onLayoutComplated, this)
        this.adapter.layoutManager.off(LayoutManager.Event.ON_CHANGED_LAYOUT_STATE, this._onChangedLayoutState, this)
    }
    private _createHolders(findHolder?: (model: IModel<T>) => Holder<T, A>) {
        var mainAxis = this.adapter.mainAxis
        this._tempHolderList.length = 0
        for (let i = 0; i < this.group.models.length; i++) {
            const model = this.group.models[i];
            var isNew = false
            var holder = findHolder && findHolder(model)
            if (!holder) {
                holder = this.adapter.viewManager.internal_getHolder(model) as any
                isNew = true
            }
            // 处理开启了延迟布局时导致的当前帧position=0的情况 预先设置一个默认值
            model.position[mainAxis] = this.group.position[mainAxis]
            this._holderList.push(holder)
            this._tempHolderList.push({ holder, model, isNew })
        }
    }
    private _calculateInnerSize(model: IModel<T>, group: Group<T>) {
        if (this._total == 0) return false
        var size = model.size[this.adapter.crossAxis]
        return this._innerSize + size + this.adapter.layoutManager.spacing > group.size[this.adapter.crossAxis]
    }
    private _onLayoutComplated(complatedIndexs: number[]) {
        if (complatedIndexs.indexOf(this.index) != -1) {
            for (let i = 0; i < this.holderList.length; i++) {
                const holder = this.holderList[i];
                holder.internal_layout()
            }
            if (this.group.isFixed) {
                this._calcFixedPosition()
            }
        }
    }
    private _calcFixedPosition() {
        var length = this._holderList.length
        var mainAxis = this.adapter.mainAxis
        for (let i = 0; i < length; i++) {
            const holder = this._holderList[i]
            if (!holder.element.fixed) continue
            var position = { x: holder.model.position.x, y: holder.model.position.y }
            var relativeOffset = 0
            var boundary = this._getModelBoundary(holder.model)
            if (this._isNeedFixed(boundary)) {
                position[mainAxis] -= boundary
                var holderList = this.adapter.viewManager.getNextFixedHolders(this.index)
                relativeOffset = this._getRelativeNextHolderOffset(holder, holderList)
            }
            position[mainAxis] += relativeOffset * this.adapter.multiplier
            if (position[mainAxis] != holder.node.position[mainAxis]) {
                holder.node.setPosition(position.x, position.y)
            }
        }
    }
    /** 当布局参数改变时 重新计算布局 */
    private _onChangedLayoutState() {
        this.adapter.layoutManager.layout(this.group)
    }
    private _onScroll() {
        if (!this.group.isFixed || this._holderList.length == 0) return
        this._calcFixedPosition()
    }
    private _onLateUpdate(deltaTime: number) {
        if (ADAPTER_DEBUG_VIEW && this.group) {
            this.__drawDebug()
        }
    }
    private _isNeedFixed(boundary: number) {
        return this.adapter.multiplier == 1 ? boundary >= 0 : boundary <= 0
    }
    private _getModelBoundary(model: IModel<T>) {
        var fixedOffset = Helper.isNumber(model.element.fixedOffset) ? model.element.fixedOffset : 0
        return this.adapter.multiplier == 1
            ? this._getModelHeaderBoundary(model) + fixedOffset
            : this._getModelFooterBoundary(model) - fixedOffset
    }
    private _getModelHeaderBoundary(model: IModel<T>) {
        var mainAxis = this.adapter.mainAxis
        return model.position[mainAxis]
            + model.size[mainAxis]
            * (1 - model.anchorPoint[mainAxis])
            * model.scale[mainAxis]
            + this.adapter.scrollManager.contentPosition
    }
    private _getModelFooterBoundary(model: IModel<T>) {
        var mainAxis = this.adapter.mainAxis
        return model.position[mainAxis]
            - model.size[mainAxis]
            * model.anchorPoint[mainAxis]
            * model.scale[mainAxis]
            + this.adapter.scrollManager.contentPosition
    }
    private _getModelSizeWithSpacing(model: IModel<T>) {
        var mainAxis = this.adapter.mainAxis
        var fixedOffset = Helper.isNumber(model.element.fixedOffset) ? model.element.fixedOffset : 0
        var spacing = Helper.isNumber(model.element.fixedSpacing) ? model.element.fixedSpacing : this.adapter.viewManager.spacing
        return model.size[mainAxis] * model.scale[mainAxis] + fixedOffset + spacing
    }
    private _getReatureRelativeBoundary(model: IModel<T>, offset: number) {
        var boundary = this.adapter.multiplier == 1
            ? this._getModelHeaderBoundary(model)
            : this._getModelFooterBoundary(model)
        var value = this.adapter.multiplier == 1
            ? boundary + offset
            : offset - boundary
        return Math.min(value, offset)
    }
    private _getRelativeNextHolderOffset(currentHolder: Holder, holderList: Holder[]) {
        var length = holderList.length
        var crossAxis = this.adapter.crossAxis
        var sizeSpacing = this._getModelSizeWithSpacing(currentHolder.model)
        var relativeOffset = 0
        for (let i = 0; i < length; i++) {
            const holder = holderList[i];
            var offset = this._getReatureRelativeBoundary(holder.model, sizeSpacing)
            var sameScale = currentHolder.model.scale[crossAxis] == holder.model.scale[crossAxis]
            var sameSize = currentHolder.model.size[crossAxis] == holder.model.size[crossAxis]
            if (currentHolder.fixedIndex == holder.fixedIndex && sameScale && sameSize) {
                relativeOffset = offset > 0 ? offset : 0
                break
            }
            if (offset > 0) {
                relativeOffset = Math.max(relativeOffset, offset)
            }
        }
        return relativeOffset
    }
}




