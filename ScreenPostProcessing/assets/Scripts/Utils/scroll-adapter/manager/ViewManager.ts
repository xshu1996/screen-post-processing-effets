// import { _decorator, Node, instantiate } from 'cc';
import { Group } from '../abstract/Group';
import { Holder } from '../abstract/Holder';
import { Manager } from '../abstract/Manager';
import { ScrollAdapter } from '../abstract/ScrollAdapter';
import { View } from '../abstract/View';
import { ArrangeAxis, MagneticDirection, ScrollDirection, StretchDirection } from '../define/enum';
import { ILike, IModel } from '../define/interface';
import { Helper } from '../help/helper';
import { ModelManager } from './ModelManager';
import { ScrollManager } from './ScrollManager';
const { ccclass, property } = cc._decorator;
enum Event {
    ON_SCROLL,
    ON_LATEUPDATE,
    ON_CLEARVIEWS,
    ON_UPDATE_VIEWS,
    ON_CHANGED_VIRTUALSIZE,
    ON_MAGNETIC,
    ON_CHANGED_OVERFLOWHEADER,
    ON_RESET_ALL_STATE,
    ON_CHANGED_SPACING,
}
@ccclass('ViewManager')
export class ViewManager<T = any> extends Manager {
    public static Event = Event
    @property({ type: ArrangeAxis }) private _arrangeAxis: ArrangeAxis = ArrangeAxis.Start
    @property({
        type: ArrangeAxis,
        tooltip: `主轴方向的排列方式
        Start: 从上到下、从左到右
        End: 从下到上、从右到左`
    }) public get arrangeAxis() { return this._arrangeAxis }
    public set arrangeAxis(value: ArrangeAxis) {
        if (value == this._arrangeAxis) return
        this._arrangeAxis = value
        this._resetAllState()
    }
    @property({
        type: StretchDirection,
        tooltip: `当元素的尺寸、缩放改变时，受影响的其他元素应该如何计算新的位置
        Auto: 以可视区域中心为起点，所有其他元素向两边延伸
        Center: 以当前变化的元素为起点，所有其他元素向两边延伸
        Header: 以当前变化的元素和它头部的所有元素向头部延伸
        Footer: 以当前变化的元素和它尾部的所有元素向尾部延伸`
    }) stretchDirection: StretchDirection = StretchDirection.Auto
    @property({
        range: [0, 1],
        slide: true,
        step: 0.01,
        tooltip: `当元素移动到可视区域外偏移多少时才进行回收
        比如元素的尺寸为100，当元素超出可视范围 100+100*0.3 时就会被回收
        没有特殊需求时，默认值即可`
    }) overflowOffset: number = 0.3
    @property({
        range: [0, 1],
        slide: true,
        step: 0.01,
        tooltip: `此值会影响填充元素的时机
        没有特殊需求时，默认值即可`
    }) enterOffset: number = 0
    @property() _spacing: number = 0
    @property({
        tooltip: "主轴方向元素的间隙"
    }) get spacing() { return this._spacing }
    public set spacing(value: number) {
        if (value == this._spacing) return
        this._spacing = value
        this._resetAllState()
    }
    @(property as any)({ group: { id: "padding", name: "padding" } }) left: number = 0
    @(property as any)({ group: { id: "padding", name: "padding" } }) right: number = 0
    @(property as any)({ group: { id: "padding", name: "padding" } }) top: number = 0
    @(property as any)({ group: { id: "padding", name: "padding" } }) bottom: number = 0
    @property({
        tooltip: `磁性停靠
        开启后，会在增加数据时，根据设置进行自动滚动到顶部或底部`
    }) magnetic: boolean = false
    @property({
        type: MagneticDirection,
        visible: function () { return this.magnetic },
        tooltip: `停靠的方向`
    }) magneticDirection: MagneticDirection = MagneticDirection.Header
    @property({
        visible: function () { return this.magnetic },
        tooltip: "停靠动画的时长"
    }) magneticDuration: number = 0.5
    @property({
        visible: function () { return this.magnetic },
        tooltip: `默认情况下，仅当添加数据时才会触发停靠
        当开启时，元素的尺寸改变时,也会否触发停靠`
    }) magneticSizeChanges: boolean = false
    @property({
        tooltip: "头部循环"
    }) loopHeader: boolean = false
    @property({
        tooltip: "尾部循环"
    }) loopFooter: boolean = false
    private _groupLength: number = 0
    private _cacheGroups: Group<T>[] = []
    private _groups: Group<T>[] = []
    private _disableViews: View<T>[] = []
    private _visibleViews: View<T>[] = []
    private _fixedViews: View<T>[] = []
    private _disableHolders: Holder<T>[] = []
    private _isFill: boolean = false
    private _headerIndex: number = -1
    private _footerIndex: number = -1
    private _virtualSize: number = 0
    private _overflowHeader: number = 0
    private _cacheHeadeDatas: T[] = []
    private _cacheHeadePosition: ILike
    public get header() { return this._visibleViews[0] }
    public get footer() { return this._visibleViews[this._visibleViews.length - 1] }

    public get overflowHeader() { return this._overflowHeader }
    private set overflowHeader(value: number) {
        if (value == this._overflowHeader) return
        this._overflowHeader = value
        this.emit(Event.ON_CHANGED_OVERFLOWHEADER, value)
    }

    public get virtualSize() { return this._virtualSize }
    private set virtualSize(value: number) {
        if (value == this._virtualSize) return
        this._virtualSize = value
        this.emit(Event.ON_CHANGED_VIRTUALSIZE)
    }

    public get groupLength() { return this._groupLength }

    public get visibleLength() { return this._visibleViews.length }
    public get min() {
        if (!this.header) return 0
        var value = this.adapter.isArrangeAxisStart
            ? this.internal_getGroupFooterBoundary(this.footer.group)
            : this.internal_getGroupHeaderBoundary(this.header.group)
        return value
    }
    public get max() {
        if (!this.header) return 0
        var value = this.adapter.isArrangeAxisStart
            ? this.internal_getGroupHeaderBoundary(this.header.group)
            : this.internal_getGroupFooterBoundary(this.footer.group)
        return value
        // return this.adapter.isArrangeStart ? this.header.headerBoundary : this.footer.footerBoundary
    }
    protected onInit(): void {
        this.adapter.modelManager.on(ModelManager.Event.ON_CHANGE_BEFORE, this._onModelChangeBefore, this)
        this.adapter.modelManager.on(ModelManager.Event.ON_INSERT, this._updateGroups, this)
        this.adapter.modelManager.on(ModelManager.Event.ON_REMOVE, this._updateGroups, this)
        this.adapter.modelManager.on(ModelManager.Event.ON_MOVE, this._updateGroups, this)
        this.adapter.modelManager.on(ModelManager.Event.ON_CLEAR, this._onClearModel, this)
        this.adapter.scrollManager.on(ScrollManager.Event.ON_SCROLL, this._onScroll, this)
        this.adapter.scrollManager.on(ScrollManager.Event.ON_VIEW_SIZE_CHANGED, this._resetAllState, this)
        this.adapter.scrollManager.on(ScrollManager.Event.ON_CHANGED_ORIENTATION, this._resetAllState, this)
    }
    private _clearAll() {
        for (let i = 0, len = this._visibleViews.length; i < len; i++) {
            this._recycleViewToDisableViews(this._visibleViews[i])
        }
        this._cacheGroups.push(...this._groups)
        this._clearFixedViews()
        this._visibleViews.length = 0
        this._groups.length = 0
        this.virtualSize = 0
        this.overflowHeader = 0
    }
    private _onClearModel() {
        this._clearAll()
        this.emit(Event.ON_CLEARVIEWS)
    }
    private _resetAllState() {
        if (CC_EDITOR) return
        this._clearAll()
        this.internal_updateVisibleView(0)
        this.emit(Event.ON_RESET_ALL_STATE)
    }

    /**
     * 数据即将发生变化，在这之前缓存当前header信息
     */
    private _onModelChangeBefore() {
        if (!this.header) return
        // 优先以索引0为参考
        if (this.virtualSize > this.adapter.mainAxisSize) {
            var index = this.getVisibleIndexByGroupIndex(0)
            if (-1 != index) {
                var header = this._visibleViews[index]
                this._cacheHeadeDatas = header.group.models.map(item => item.data)
                this._cacheHeadePosition = {
                    x: header.group.position.x,
                    y: header.group.position.y,
                }
            } else {
                this._cacheHeadeDatas = this.header.group.models.map(item => item.data)
                this._cacheHeadePosition = { x: this.header.group.position.x, y: this.header.group.position.y }
            }
        }
    }
    /**
     * 更新所有Group
     */
    private _updateGroups(insertIndex: number) {
        var view = this._getViewFromDisibleViews(null)
        var gindex = this.getGroupIndexByModelIndex(insertIndex)
        if (-1 == gindex) {
            gindex = this._groupLength - 1
        }
        var group: Group<T> = null
        var clear = false
        var options = { modelIndex: insertIndex, fixedIndex: -1 }
        var prevGroup = this._groups[gindex - 1]
        if (prevGroup) {
            options.fixedIndex = prevGroup.fixedIndex
        }
        while (true) {
            group = this._groups[gindex]
            if (!group) {
                group = this._getGroupFromCache()
                group.internal_setIndex(this._groups.length)
                this._groups.push(group)
                gindex = this._groups.length
            }
            var ok = group.internal_insert(options, view, clear)
            gindex++
            clear = true
            if (!ok) {
                break
            }
        }
        var caches = this._groups.splice(gindex, this._groups.length)
        this._cacheGroups.push(...caches)
        this._groupLength = this._groups.length
        // 查询变化前的画面信息
        var referIndex = -1
        var virtualSize = 0
        if (this._cacheHeadeDatas.length > 0) {
            referIndex = this._groups.findIndex(item => item.internal_includes(this._cacheHeadeDatas))
        }
        var relative = this._groups[referIndex]
        if (relative) {
            // 如果参考点存在，则保持不动
            virtualSize += relative.size[this.adapter.mainAxis] + this.spacing
            relative.internal_setPosition(this._cacheHeadePosition[this.adapter.mainAxis])
        }
        // 以参考点为起始向下上扩展
        for (let i = referIndex - 1; i >= 0; i--) {
            var curr = this._groups[i]
            this._calcMainAxisPosition(curr, relative, MagneticDirection.Header)
            virtualSize += curr.size[this.adapter.mainAxis] + this.spacing
            relative = curr
        }
        relative = this._groups[referIndex]
        // 以参考点为起始向下扩展
        for (let i = referIndex + 1; i < this.groupLength; i++) {
            var curr = this._groups[i]
            this._calcMainAxisPosition(curr, relative, MagneticDirection.Footer)
            virtualSize += curr.size[this.adapter.mainAxis] + this.spacing
            relative = curr
        }
        virtualSize -= this.spacing
        this._virtualSize = Math.max(0, virtualSize)
        this._resetOverflowHeader(this._groups[0])
        view.internal_reset()
        this._disableViews.push(view)
        this.updateVisibles(referIndex)
        this._cacheHeadeDatas = []
        this._cacheHeadePosition = null
    }
    private updateVisibles(referIndex: number) {
        var cacheHolders = []
        referIndex = Math.max(0, referIndex)
        const findHolder = (model: IModel<T>) => {
            var index = cacheHolders.findIndex(holder => holder.oldData == model.data)
            if (-1 != index) {
                return cacheHolders.splice(index, 1)[0]
            }
            return null
        }
        // 将所有holder取出来
        for (let i = 0; i < this._visibleViews.length; i++) {
            const view = this._visibleViews[i];
            cacheHolders = cacheHolders.concat(view.holderList)
            view.internal_reset()
        }
        var mainAxisSize = this.adapter.mainAxisSize
        var visibleIndex = 0
        var length = this.visibleLength
        for (let i = referIndex, len = this._groups.length; i < len; i++) {
            const group = this._groups[i]
            var visibleSize = this.getVisibleMainAxisSize()
            if (visibleSize >= mainAxisSize && length <= 0) {
                break
            }
            var view = this._visibleViews[visibleIndex++]
            if (!view) {
                view = this._getViewFromDisibleViews(group.index)
                this._visibleViews.push(view)
            }
            // 只处理创建Holder的逻辑，不会马上显示
            view.internal_preVisible(group, findHolder)
            length--
        }
        // 回收空view
        for (let i = this._visibleViews.length - 1; i >= 0; i--) {
            var view = this._visibleViews[i]
            if (view.holderList.length > 0) {
                break
            }
            this._disableFromVisibleViews(i)
        }
        // 回收未使用的holder
        for (let i = 0, len = cacheHolders.length; i < len; i++) {
            const holder = cacheHolders[i];
            holder.internal_disable()
            this._disableHolders.push(holder)
        }
        // 最后将所有Holder显示（解决：向数据头部添加数据时，每个Holder在显示同时修改了尺寸，导致后续的Holder坐标没有更新）
        // 解决办法：将显示的逻辑放到最后执行
        for (let i = 0; i < this.visibleLength; i++) {
            this._visibleViews[i].internal_visible()
        }
        this._forceFill()
        this._calcMagnetic()
        this.emit(Event.ON_UPDATE_VIEWS)
    }
    private _getGroupFromCache() {
        var group = this._cacheGroups.pop()
        if (!group) {
            group = new Group<T>(this.adapter)
        }
        group.internal_reset()
        return group
    }
    private _calcMagnetic() {
        if (!this.magnetic) return
        if (!this.header) return
        var ok = false
        if (this.adapter.scrollManager.velocity == 0) {
            if (this.magneticDirection == MagneticDirection.Footer) {
                if (this.footer.index == this._groupLength - 1) {
                    this.adapter.scrollManager.scrollToFooter(this.magneticDuration)
                    ok = true
                }
            } else {
                if (this.header.index == 0) {
                    this.adapter.scrollManager.scrollToHeader(this.magneticDuration)
                    ok = true
                }
            }
        }
        this.emit(Event.ON_MAGNETIC, ok)
    }
    private _calcMainAxisPosition(group: Group<T>, relativeGroup: Group<T>, direction: MagneticDirection) {
        if (!group) return
        if (!relativeGroup) {
            // this._setGroupPosition(group, this._getMainAxisHeaderPosition(group))
            group.internal_setPosition(this._getMainAxisHeaderPosition(group))
        } else {
            var xy = this.adapter.mainAxis
            var multiplier = this.adapter.multiplier
            var dirMultiplier = direction == MagneticDirection.Footer ? 1 : -1
            var relPoint, curPoint
            if (direction == MagneticDirection.Footer) {
                relPoint = multiplier == 1 ? relativeGroup.anchorPoint[xy] : 1 - relativeGroup.anchorPoint[xy]
                curPoint = multiplier == 1 ? 1 - group.anchorPoint[xy] : group.anchorPoint[xy]
            } else {
                relPoint = multiplier == 1 ? 1 - relativeGroup.anchorPoint[xy] : relativeGroup.anchorPoint[xy]
                curPoint = multiplier == 1 ? group.anchorPoint[xy] : 1 - group.anchorPoint[xy]
            }
            var position = relativeGroup.position[xy]
            position -= (relativeGroup.size[xy] * relPoint * dirMultiplier) * multiplier
            position -= this.spacing * multiplier * dirMultiplier
            position -= (group.size[xy] * curPoint * dirMultiplier) * multiplier
            // this._setGroupPosition(group, position)
            group.internal_setPosition(position)
        }
    }
    private _getMainAxisHeaderPosition(group: Group<T>) {
        var position = 0
        var anchor = 0
        if (this.adapter.isVertical) {
            position = this.adapter.isArrangeAxisStart ? -this.top : this.bottom
            anchor = this.adapter.isArrangeAxisStart ? 1 - group.anchorPoint[this.adapter.mainAxis] : group.anchorPoint[this.adapter.mainAxis]
        } else {
            position = this.adapter.isArrangeAxisStart ? this.left : -this.right
            anchor = this.adapter.isArrangeAxisStart ? group.anchorPoint[this.adapter.mainAxis] : 1 - group.anchorPoint[this.adapter.mainAxis]
        }
        position -= anchor * group.size[this.adapter.mainAxis] * this.adapter.multiplier
        return position
    }

    private _getViewFromDisibleViews(groupIndex: number): View<T> {
        var view = null
        if (groupIndex != null) {
            var index = this._fixedViews.findIndex(view => view.index == groupIndex)
            if (-1 != index) {
                var remView = this._fixedViews.splice(index, 1)[0]
                this._recycleViewToDisableViews(remView)
            }
        }
        if (!view) {
            view = this._disableViews.pop()
        }
        if (!view) {
            view = this.adapter.getView()
        }
        return view
    }
    private _getHolderFromDisableHolders(model: IModel<T>) {
        var index = this._disableHolders.findIndex(holder => holder.code == model.code)
        if (-1 != index) {
            return this._disableHolders.splice(index, 1)[0]
        }
    }
    /**
     * 禁用 view 并回收所有节点
     * @param visibleIndex 可视view索引
     */
    private _disableFromVisibleViews(visibleIndexOrView: number | View) {
        var remIndex = -1
        if (visibleIndexOrView instanceof View) {
            remIndex = this._visibleViews.findIndex(item => item.index == visibleIndexOrView.index)
        } else {
            remIndex = visibleIndexOrView
        }
        this._recycleViewToDisableViews(this._visibleViews[remIndex])
        this._visibleViews.splice(remIndex, 1)
    }
    private _recycleViewToDisableViews(view: View) {
        if (!view) return
        view.internal_recycleHolders(holder => this._disableHolders.push(holder))
        view.internal_disable()
        this._disableViews.push(view)
    }
    private _clearFixedViews() {
        for (let i = 0, len = this._fixedViews.length; i < len; i++) {
            const view = this._fixedViews[i];
            this._recycleViewToDisableViews(view)
        }
        this._fixedViews.length = 0
    }
    private _checkHeaderInvisible() {
        if (!this.header) return
        if (!this.loopFooter && this.footer.index == this.groupLength - 1) {
            return
        }
        if (this._isOverflowHeader(this.header.group)) {
            this._disableFromVisibleViews(0)
            this._checkHeaderInvisible()
        }
    }
    private _checkFooterInvisible() {
        if (!this.footer) return
        if (!this.loopHeader && this.header.index == 0) {
            return
        }
        if (this._isOverflowFooter(this.footer.group)) {
            this._disableFromVisibleViews(this._visibleViews.length - 1)
            this._checkFooterInvisible()
        }
    }

    private _isOverflowHeader(group: Group<T>, defaultOffset: number = this.overflowOffset) {
        var footerBoundary = this.internal_getGroupFooterBoundary(group)
        defaultOffset = defaultOffset * group.size[this.adapter.mainAxis]
        return this.adapter.multiplier == 1 ? footerBoundary >= defaultOffset : footerBoundary <= -defaultOffset
    }
    private _isOverflowFooter(group: Group<T>, defaultOffset: number = this.overflowOffset) {
        var headerBoundary = this.internal_getGroupHeaderBoundary(group)
        defaultOffset = defaultOffset * group.size[this.adapter.mainAxis]
        return this.adapter.multiplier == 1
            ? headerBoundary + this.adapter.mainAxisSize <= -defaultOffset
            : headerBoundary - this.adapter.mainAxisSize >= defaultOffset
    }

    private _isEnterFooter(group: Group<T>) {
        if (!group) return false
        var footerBoundary = this.internal_getGroupFooterBoundary(group)
        var defaultOffset = (this.enterOffset) * group.size[this.adapter.mainAxis]
        return this.adapter.multiplier == 1
            ? footerBoundary + this.adapter.mainAxisSize + defaultOffset >= 0
            : footerBoundary - this.adapter.mainAxisSize - defaultOffset <= 0
    }
    private _isEnterHeader(group: Group<T>) {
        if (!group) return false
        var headerBoundary = this.internal_getGroupHeaderBoundary(group)
        var defaultOffset = (this.overflowOffset) * group.size[this.adapter.mainAxis]
        return this.adapter.multiplier == 1
            ? headerBoundary - defaultOffset <= 0
            : headerBoundary + defaultOffset >= 0
    }

    private _fillHeader() {
        var group = this._groups[this._headerIndex]
        if (!this._isEnterHeader(group)) {
            return
        }
        // 初始化尺寸
        var { index, size } = this._accumTargetSizeTowardsHeader(group.index, this.internal_getInitHeaderSize(group))
        var target = this._groups[index]
        if (!target) {
            return
        }
        if (-1 != this.getVisibleIndexByGroupIndex(index)) {
            return
        }
        var position = this.internal_convertSizeToHeaderPosition(size, target)
        // this._setGroupPosition(target, position)
        target.internal_setPosition(position)
        var view = this._getViewFromDisibleViews(target.index)
        this._visibleViews.unshift(view)
        view.internal_preVisible(target).internal_visible()
        if (view.index == 0) {
            this._resetOverflowHeader(view.group)
        }
        this._headerIndex = target.index
        this._fillHeader()
    }
    private _fillFooter() {
        var group = this._groups[this._footerIndex]
        if (!this._isEnterFooter(group)) {
            return
        }
        // 初始化尺寸
        var { index, size } = this._accumTargetSizeTowardsFooter(group.index, this.internal_getInitFooterSize(group))
        var target = this._groups[index]
        if (!target) {
            return
        }
        if (-1 != this.getVisibleIndexByGroupIndex(index)) {
            return
        }
        var position = this.internal_convertSizeToFooterPosition(size, target)
        target.internal_setPosition(position)
        // this._setGroupPosition(target, position)
        var view = this._getViewFromDisibleViews(target.index)
        this._visibleViews.push(view)
        view.internal_preVisible(target).internal_visible()
        if (view.index == 0) {
            this._resetOverflowHeader(view.group)
        }
        this._footerIndex = target.index
        this._fillFooter()
    }
    private _fillFixedView() {
        if (!this.header || (this.header.group.fixedIndex == -1 && !this.header.group.isFixed)) {
            return
        }
        var startIndex = this.header.index
        var mainAxis = this.adapter.mainAxis
        // 创建当前应该显示的fixed
        var size = this.internal_getInitHeaderSize(this.header.group)
        for (let i = startIndex - 1; i >= 0; i--) {
            var group = this._groups[i]
            if (!group) {
                console.error("_fillFixedView错误 找不到group", i)
                return
            }
            size += group.size[mainAxis] + this.spacing
            if (!group.isFixed) {
                continue
            }
            var position = this.internal_convertSizeToHeaderPosition(size, group)
            if (-1 != this._fixedViews.findIndex(view => view.index == group.index)) {
                if (!Helper.approximately(position, group.position[mainAxis])) {
                    // this._setGroupPosition(group, position)
                    group.internal_setPosition(position)
                    this.adapter.layoutManager.layout(group)
                }
                break
            }
            this._clearFixedViews()
            var position = this.internal_convertSizeToHeaderPosition(size, group)
            // this._setGroupPosition(group, position)
            group.internal_setPosition(position)
            var view = this._getViewFromDisibleViews(group.index)
            view.internal_preVisible(group).internal_visible()
            this._fixedViews.push(view)
            break
        }
    }
    private _accumTargetSizeTowardsHeader(index: number, size: number) {
        var length = this._groups.length
        do {
            if (index == 0) {
                if (this.loopHeader) {
                    index = length
                }
            }
            if (index == 0) {
                return { index, size }
            }
            index--
            var info = this._groups[index]
            if (!info) {
                return { index, size }
            }
            size += this.internal_accumulationSize(index)
            if (size >= 0) {
                return { index, size }
            }
        } while (true)
    }
    private _accumTargetSizeTowardsFooter(index: number, size: number) {
        var length = this._groups.length
        do {
            if (index == length - 1) {
                if (this.loopFooter) {
                    index = -1
                }
            }
            if (index == length - 1) {
                return { index, size }
            }
            index++
            var viewInfo = this._groups[index]
            if (!viewInfo) {
                return { index, size }
            }
            size += this.internal_accumulationSize(index)
            if (size >= 0) {
                return { index, size }
            }
        } while (true)
    }

    private _fillFooterHandle() {
        this._checkHeaderInvisible()
        this._fillFooter()
    }
    private _fillHeaderHandle() {
        this._checkFooterInvisible()
        this._fillHeader()
    }
    private _forceFill() {
        this._updateHeaderFooterIndex()
        this._fillHeaderHandle()
        this._fillFooterHandle()
    }
    private _updateHeaderFooterIndex() {
        this._headerIndex = this.header ? this.header.index : 0
        this._footerIndex = this.footer ? this.footer.index : 0
    }
    private _onScroll(direction: ScrollDirection) {
        if (this._groups.length == 0) return
        this._updateHeaderFooterIndex()
        switch (direction) {
            case ScrollDirection.Up:
            case ScrollDirection.Left:
                // 向下填充 
                if (this.adapter.isArrangeAxisStart) {
                    this._fillFooterHandle()
                } else {
                    this._fillHeaderHandle()
                }
                break
            case ScrollDirection.Down:
            case ScrollDirection.Right:
                // 向上填充
                if (this.adapter.isArrangeAxisStart) {
                    this._fillHeaderHandle()
                } else {
                    this._fillFooterHandle()
                }
                break
        }
        this._fillFixedView()
        this.emit(Event.ON_SCROLL)
    }
    /**
     * 向头部伸展
     */
    private _stretchToHeader(current: number, start: number) {
        // 以当前改变的内容为基础 向上头部延伸
        var prev = this._visibleViews[current]
        for (let i = start; i >= 0; i--) {
            const curr = this._visibleViews[i];
            if (prev) {
                this._calcMainAxisPosition(curr.group, prev.group, MagneticDirection.Header)
                this.adapter.layoutManager.layout(curr.group)
            } else if (this.getVisibleMainAxisSize() < this.adapter.mainAxisSize) {
                this._calcMainAxisPosition(curr.group, null, MagneticDirection.Header)
            }
            prev = curr
        }
    }
    /**
     * 向尾部伸展
     */
    private _stretchToFooter(current: number, start: number) {
        // 以当前改变的内容为基础 向上尾部延伸
        var prev = this._visibleViews[current]
        for (let i = start; i < this._visibleViews.length; i++) {
            const curr = this._visibleViews[i];
            if (prev) {
                this._calcMainAxisPosition(curr.group, prev.group, MagneticDirection.Footer)
                this.adapter.layoutManager.layout(curr.group)
            } else if (this.getVisibleMainAxisSize() < this.adapter.mainAxisSize) {
                this._calcMainAxisPosition(curr.group, null, MagneticDirection.Footer)
            }
            prev = curr
        }
    }
    /**
     * 重置overflowHeader 使其保持在0的位置
     */
    private _resetOverflowHeader(group: Group<any>) {
        if (!group) return this.overflowHeader = 0
        var mainAxis = this.adapter.mainAxis
        var anchor = group.anchorPoint[mainAxis]
        anchor = this.adapter.multiplier == 1 ? 1 - anchor : anchor
        var offset = group.position[mainAxis]
        offset += group.size[mainAxis] * anchor * this.adapter.multiplier
        this.overflowHeader = offset
    }
    /**
    * 当item尺寸改变时 计算相对于content的头部溢出偏移量
    */
    private _calcOverflowHeader(group: Group<T>, centerIndex: number, visibleIndex: number) {
        var zero = this.getVisibleIndexByGroupIndex(0)
        if (-1 != zero) {
            var header = this._visibleViews[zero]
            return this._resetOverflowHeader(header.group)
        }
        var mainAxis = this.adapter.mainAxis
        var anchor = group.anchorPoint[mainAxis]
        anchor = this.adapter.multiplier == 1 ? 1 - anchor : anchor
        var oldSize = group.oldSize[mainAxis]
        var newSize = group.size[mainAxis]
        var multiplier = this.adapter.multiplier
        switch (this.stretchDirection) {
            case StretchDirection.Header://✅
                // 判断改变的item是否有被testNode覆盖 也就是说是否在范围内，如果不在则不用理会
                // 判断旧坐标是否大于overflowHeader 大于说明有被覆盖
                var oldOffset = group.oldPosition[mainAxis] + (oldSize * anchor) * multiplier
                var ok = multiplier == 1 ? this.overflowHeader >= oldOffset : this.overflowHeader <= oldOffset
                if (ok) {
                    this.overflowHeader += (newSize - oldSize) * multiplier
                }
                break
            case StretchDirection.Footer://✅
                var oldOffset = group.oldPosition[mainAxis] + (oldSize * anchor) * multiplier
                var ok = multiplier == 1 ? this.overflowHeader >= oldOffset : this.overflowHeader <= oldOffset
                if (ok) {
                } else {
                    this.overflowHeader -= (newSize - oldSize) * multiplier
                }
                break
            case StretchDirection.Center://✅
                var oldOffset = group.oldPosition[mainAxis] + (oldSize * anchor) * multiplier
                var ok = multiplier == 1 ? this.overflowHeader >= oldOffset : this.overflowHeader <= oldOffset
                if (ok) {
                    this.overflowHeader += (newSize - oldSize) * 0.5 * multiplier
                } else {
                    this.overflowHeader -= (newSize - oldSize) * 0.5 * multiplier
                }
                break
            case StretchDirection.Auto://✅
                var oldOffset = group.oldPosition[mainAxis] + (oldSize * anchor) * multiplier
                var ok = multiplier == 1 ? this.overflowHeader >= oldOffset : this.overflowHeader <= oldOffset
                if (centerIndex <= visibleIndex) {
                    oldOffset = group.oldPosition[mainAxis] + (oldSize * anchor) * multiplier
                    ok = multiplier == -1 ? this.overflowHeader >= oldOffset : this.overflowHeader <= oldOffset
                }
                if (ok) {
                    if (centerIndex <= visibleIndex) {
                        this.overflowHeader -= (newSize - oldSize) * multiplier
                    } else {
                        this.overflowHeader += (newSize - oldSize) * multiplier
                    }
                }
                break
        }
    }
    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_lateUpdate(deltaTime: number) {
        if (this._isFill) {
            this._isFill = false
            this._forceFill()
        }
        this.emit(Event.ON_LATEUPDATE, deltaTime)
    }
    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_viewChanged(view: View, oldMainAxisSize: number) {
        var cross = view.group.size[this.adapter.mainAxis] - oldMainAxisSize
        this.virtualSize += cross
        var visibleIndex = this.getVisibleIndexByGroupIndex(view.index)
        var centerIndex = -1
        if (this.getVisibleMainAxisSize() < this.adapter.mainAxisSize || this.stretchDirection == StretchDirection.Footer) {
            // 以当前改变的内容为基础 向上尾部延伸
            let prev = visibleIndex - 1
            if (!this._visibleViews[prev]) {
                this.adapter.layoutManager.layout(view.group)
            }
            this._stretchToFooter(prev, visibleIndex)
        } else if (this.stretchDirection == StretchDirection.Header) {
            // 以当前改变的内容为基础 向上头部延伸
            let prev = visibleIndex + 1
            if (!this._visibleViews[prev]) {
                this.adapter.layoutManager.layout(view.group)
            }
            this._stretchToHeader(prev, visibleIndex)
        } else if (this.stretchDirection == StretchDirection.Center) {
            this.adapter.layoutManager.layout(view.group)
            this._stretchToHeader(visibleIndex, visibleIndex - 1)
            this._stretchToFooter(visibleIndex, visibleIndex + 1)
        } else {
            centerIndex = this.adapter.centerManager.getCenterVisibleIndex()
            if (-1 != centerIndex) {
                var center = this._visibleViews[centerIndex]
                this.adapter.layoutManager.layout(center.group)
                this._stretchToHeader(centerIndex, centerIndex - 1)
                this._stretchToFooter(centerIndex, centerIndex + 1)
            } else {
                throw Error("找不到中心索引" + view.index)
            }

        }
        // 尺寸改变时 修复百分比
        this._calcOverflowHeader(view.group, centerIndex, visibleIndex)
        if (this.magneticSizeChanges) {
            this._calcMagnetic()
        }
        this._isFill = true
        this.emit(Event.ON_CHANGED_VIRTUALSIZE)
    }
    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_getHolder(model: IModel<T>): Holder<T, ScrollAdapter> {
        var holder = this._getHolderFromDisableHolders(model)
        if (!holder) {
            var prefab = this.adapter.getPrefab(model.data)
            var node = cc.instantiate(prefab) as cc.Node
            holder = this.adapter.getHolder(node, model.code)
        }
        holder.node.parent = this.adapter.scrollManager.getLayerNode(model.element.layer)
        return holder
    }
    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_updateVisibleView(index: number) {
        // 延迟刷新，取最小影响行数
        this._onModelChangeBefore()
        this._updateGroups(index)
    }
    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_getGroupFooterBoundary(group: Group<T>) {
        if (!group) return 0
        var anchor = group.anchorPoint[this.adapter.mainAxis]
        anchor = this.adapter.multiplier == 1 ? anchor : 1 - anchor
        var value = group.position[this.adapter.mainAxis]
        value -= (group.size[this.adapter.mainAxis] * anchor) * this.adapter.multiplier
        value += this.adapter.scrollManager.contentPosition
        return value
    }
    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_getGroupHeaderBoundary(group: Group<T>) {
        if (!group) return 0
        var anchor = group.anchorPoint[this.adapter.mainAxis]
        anchor = this.adapter.multiplier == 1 ? 1 - anchor : anchor
        var value = group.position[this.adapter.mainAxis]
            + this.adapter.scrollManager.contentPosition
            + (anchor * group.size[this.adapter.mainAxis]) * this.adapter.multiplier
        return value
    }
    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_getInitHeaderSize(group: Group<T>) {
        if (!group) return 0
        var anchor = group.anchorPoint[this.adapter.mainAxis]
        anchor = this.adapter.multiplier == 1 ? 1 - anchor : anchor
        var value = -group.position[this.adapter.mainAxis] * this.adapter.multiplier
        value -= group.size[this.adapter.mainAxis] * anchor
        value -= this.adapter.scrollManager.contentPosition * this.adapter.multiplier
        value = this.adapter.mainAxisSize - value
        return value
    }
    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_getInitFooterSize(group: Group<T>) {
        if (!group) return 0
        var anchor = group.anchorPoint[this.adapter.mainAxis]
        anchor = this.adapter.multiplier == 1 ? anchor : 1 - anchor
        var value = -group.position[this.adapter.mainAxis] * this.adapter.multiplier
        value += group.size[this.adapter.mainAxis] * anchor
        value -= this.adapter.scrollManager.contentPosition * this.adapter.multiplier
        return value
    }
    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_accumulationSize(index: number) {
        var group = this._groups[index]
        if (!group) return 0
        return group.size[this.adapter.mainAxis] + this.spacing
    }
    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_convertSizeToFooterPosition(totalSize: number, group: Group<T>) {
        var anchor = group.anchorPoint[this.adapter.mainAxis]
        anchor = this.adapter.multiplier == 1 ? anchor : 1 - anchor
        var size = group.size[this.adapter.mainAxis] * anchor

        var value = -this.adapter.scrollManager.contentPosition
        value -= (this.adapter.multiplier * totalSize - this.adapter.multiplier * size)
        return value
    }
    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_convertSizeToHeaderPosition(totalSize: number, group: Group<T>) {
        var anchor = group.anchorPoint[this.adapter.mainAxis]
        anchor = this.adapter.multiplier == 1 ? 1 - anchor : anchor
        var size = group.size[this.adapter.mainAxis] * anchor

        var value = this.adapter.multiplier * totalSize - this.adapter.multiplier * size
        value -= this.adapter.multiplier * this.adapter.mainAxisSize
        value -= this.adapter.scrollManager.contentPosition
        return value
    }
    // public
    public getGroup(index: number) {
        return this._groups[index]
    }
    public getVisibleView(index: number) {
        return this._visibleViews[index]
    }
    public getVisibleMainAxisSize(): number {
        if (this._visibleViews.length == 0) return 0
        var size = 0
        var xy = this.adapter.mainAxis
        for (let i = 0, len = this._visibleViews.length; i < len; i++) {
            const view = this._visibleViews[i];
            if (view.group) {
                size += view.group.size[xy] + this.spacing
            }
        }
        size -= this.spacing
        return size
    }
    public getGroupIndexByModelIndex(modelIndex: number) {
        for (let i = 0, len = this._groups.length; i < len; i++) {
            const group = this._groups[i]
            var index = group.findModelIndex(modelIndex)
            if (-1 != index) return i
        }
        return -1
    }

    public getVisibleIndexByGroupIndex(index: number) {
        return this._visibleViews.findIndex(view => view.index == index)
    }
    public getNextFixedHolders(index: number) {
        var list = []
        var start = this.getVisibleIndexByGroupIndex(index)
        for (let i = start + 1, len = this._visibleViews.length; i < len; i++) {
            const view = this._visibleViews[i]
            if (view.index == index) continue
            if (view.group.isFixed) {
                list = view.getFixedHolders()
                break
            }
        }
        return list
    }
    public getMagneticOffset() {
        if (!this.magnetic) {
            return 0
        }
        var direction = this.adapter.isHorizontal ? -this.adapter.multiplier : this.adapter.multiplier
        if (this.magneticDirection == MagneticDirection.Footer) {
            if (!this.footer) {
                return this.adapter.mainAxisSize * direction
            }
            var value = Math.max(0, this.adapter.mainAxisSize - this.adapter.mainAxisPadding - this.getVisibleMainAxisSize()) * direction
            return value
        }
        return 0
    }
}
