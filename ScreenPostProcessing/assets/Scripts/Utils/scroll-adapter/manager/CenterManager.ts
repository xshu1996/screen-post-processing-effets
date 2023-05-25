// import { _decorator, v3 } from 'cc';
import { Group } from '../abstract/Group';
import { Manager } from '../abstract/Manager';
import { AlwaysScroll } from '../define/enum';
import { ScrollManager } from './ScrollManager';
import { ViewManager } from './ViewManager';
const { ccclass, property } = cc._decorator;
@ccclass('CenterManager')
export class CenterManager extends Manager {
    @property() private _enabled: boolean = false
    @property() get enabled() { return this._enabled }
    set enabled(value: boolean) {
        if (value == this._enabled) return
        this._enabled = value
    }
    @property({
        visible: function () { return this.enabled },
        tooltip: "自动居中动画的时长"
    }) duration: number = 1
    @property({
        range: [0, 1],
        slide: true,
        step: 0.1,
        tooltip: "容器(view)的锚点,当滚动停止时,元素锚点位置会和容器锚点位置重合"
    }) containerAnchorPoint: number = 0
    @property({
        range: [0, 1],
        slide: true,
        step: 0.1,
        tooltip: "元素(item)的锚点位置,当滚动停止时,元素锚点位置会和容器锚点位置重合"
    }) elementAnchorPoint: number = 0

    public get max() {
        var cantainerOffset = this.getContainerOffset(this.containerAnchorPoint)
        if (this.adapter.isArrangeAxisStart) {
            return cantainerOffset
        }
        return this.adapter.mainAxisSize - cantainerOffset
    }
    public get min() {
        var cantainerOffset = this.getContainerOffset(this.containerAnchorPoint)
        if (this.adapter.isArrangeAxisStart) {
            return this.adapter.mainAxisSize - cantainerOffset
        } else {
            return cantainerOffset
        }
    }

    public getContainerOffset(containerAnchorPoint: number = this.containerAnchorPoint) {
        var offset = 0
        var point = 0
        if (this.adapter.isHorizontal) {
            point = this.adapter.multiplier == -1 ? containerAnchorPoint : 1 - containerAnchorPoint
        } else {
            point = this.adapter.multiplier == 1 ? containerAnchorPoint : 1 - containerAnchorPoint
        }
        offset = this.adapter.mainAxisSize * point
        return offset
    }
    public getElementOffset(elementAnchorPoint: number = this.elementAnchorPoint) {
        var offset = 0
        if (this.adapter.isHorizontal) {
            offset = this.adapter.multiplier == -1 ? elementAnchorPoint : 1 - elementAnchorPoint
        } else {
            offset = this.adapter.multiplier == 1 ? elementAnchorPoint : 1 - elementAnchorPoint
        }
        return offset
    }
    protected onInit(): void {
        this.adapter.scrollManager.on(ScrollManager.Event.ON_ABOUT_TO_STOP, this._onAboutToStop, this)
        this.adapter.viewManager.on(ViewManager.Event.ON_UPDATE_VIEWS, this.scrollToCenter, this, true)
    }
    private _onAboutToStop() {
        this.scrollToCenter()
    }
    /**
     * 自动居中
     * @param duration 滚动事件
     */
    public scrollToCenter(duration: number = this.duration) {
        if (!this.enabled) return
        var visibleIndex = this.getCenterVisibleIndex()
        if (-1 == visibleIndex) return
        var view = this.adapter.viewManager.getVisibleView(visibleIndex)
        this.adapter.scrollManager.scrollToGroupIndex(duration, view.index)
    }
    /**
     * 获取距离给定锚点最近的单行索引
     * @param containerAnchorPoint 容器锚点
     * @param elementAnchorPoint 元素锚点
     * @returns 单行索引 groupIndex
     */
    public getCenterVisibleIndex(containerAnchorPoint: number = this.containerAnchorPoint, elementAnchorPoint: number = this.elementAnchorPoint) {
        var mainAxis = this.adapter.mainAxis
        var center = this.getContainerOffset(containerAnchorPoint)
        var visibleIndex = -1
        var minDistance = Number.MAX_SAFE_INTEGER
        for (let i = 0; i < this.adapter.viewManager.visibleLength; i++) {
            const view = this.adapter.viewManager.getVisibleView(i)
            if (!view || !view.group) break
            var position = { x: view.group.position.x, y: view.group.position.y }
            position[mainAxis] -= this.adapter.multiplier * view.group.size[mainAxis] * elementAnchorPoint
            var world = this.adapter.scrollManager.content.convertToWorldSpaceAR(cc.v3(position.x, position.y))
            var local = this.adapter.scrollManager.view.convertToNodeSpaceAR(world)
            var distance = Math.abs(local[mainAxis] + this.adapter.multiplier * center)
            if (distance < minDistance) {
                minDistance = distance
                visibleIndex = i
            }
        }
        return visibleIndex
    }
    /**
     * 获取单行索引的坐标
     * @param index 单行索引 optionsIndex
     * @param alwaysScroll 滚动方向，默认：AlwaysScroll.Auto
     * @param priorityCheckExists 当 alwaysScroll != AlwaysScroll.Auto时 是否优先从可见列表中查找 默认false
     * @returns 坐标
     */
    public getPositionByGroupIndex(index: number, alwaysScroll: AlwaysScroll = AlwaysScroll.Auto, priorityCheckExists: boolean = false) {
        var group = this.adapter.viewManager.getGroup(index)
        if (!group) {
            return null
        }
        var target: { position: number, size: number, anchor: number } = null
        if (alwaysScroll == AlwaysScroll.Header && this.adapter.viewManager.loopHeader) {
            // 向头部滚动
            if (priorityCheckExists) {
                target = this._checkExists(index)
            }
            if (target == null) {
                target = this._alwaysHeader(index, group)
            }
        } else if (alwaysScroll == AlwaysScroll.Footer && this.adapter.viewManager.loopFooter) {
            // 向尾部滚动
            if (priorityCheckExists) {
                target = this._checkExists(index)
            }
            if (target == null) {
                target = this._alwaysFooter(index, group)
            }
        } else {
            // 如果目标已存在
            target = this._checkExists(index)
            if (target == null) {
                // 目标不存在
                var header = this.adapter.viewManager.header
                var footer = this.adapter.viewManager.footer
                if (header) {
                    if (index > footer.index) {
                        // 向尾部滚动
                        target = this._calcTargetFooter(footer.group, footer.index + 1, index, group)
                    } else if (index < header.index) {
                        // 向头部滚动
                        target = this._calcTargetHeader(header.group, header.index - 1, index, group)
                    }
                } else {
                    // 当前可见区域为空，没有参考点
                    // var startOptions = this.adapter.viewManager.getViewOptions(0)
                    // target = this.calcTargetFooter(startOptions, startOptions.index, index)
                    // TODO 测试
                    target = {
                        position: group.position[this.adapter.mainAxis],
                        size: group.size[this.adapter.mainAxis],
                        anchor: group.anchorPoint[this.adapter.mainAxis]
                    }
                }
            }
        }
        return this._convertTargetToPosition(target)
    }
    private _convertTargetToPosition(target: any) {
        var position = null
        if (target) {
            var multiplier = this.adapter.multiplier
            var anchor = multiplier == -1 ? target.anchor : 1 - target.anchor
            position = -target.position
            position -= this.getContainerOffset() * multiplier
            position -= target.size * anchor * multiplier
            position += target.size * this.getElementOffset() * multiplier
        }
        return position
    }
    private _checkExists(index: number) {
        var visibleIndex = this.adapter.viewManager.getVisibleIndexByGroupIndex(index)
        if (-1 != visibleIndex) {
            let view = this.adapter.viewManager.getVisibleView(visibleIndex)
            return {
                position: view.group.position[this.adapter.mainAxis],
                size: view.group.size[this.adapter.mainAxis],
                anchor: view.group.anchorPoint[this.adapter.mainAxis]
            }
        }
        return null
    }
    /**
     * 正序累计尺寸
     */
    private _calcTargetFooter(group: Group<any>, start: number, end: number, target: Group<any>) {
        let size = this.adapter.viewManager.internal_getInitFooterSize(group)
        for (let i = start; i <= end; i++) {
            size += this.adapter.viewManager.internal_accumulationSize(i)
        }
        return {
            position: this.adapter.viewManager.internal_convertSizeToFooterPosition(size, target),
            size: target.size[this.adapter.mainAxis],
            anchor: target.anchorPoint[this.adapter.mainAxis]
        }
    }
    /**
     * 倒序累计尺寸
     */
    private _calcTargetHeader(group: Group<any>, start: number, end: number, target: Group<any>) {
        let size = this.adapter.viewManager.internal_getInitHeaderSize(group)
        for (let i = start; i >= end; i--) {
            size += this.adapter.viewManager.internal_accumulationSize(i)
        }
        return {
            position: this.adapter.viewManager.internal_convertSizeToHeaderPosition(size, target),
            size: target.size[this.adapter.mainAxis],
            anchor: target.anchorPoint[this.adapter.mainAxis]
        }
    }
    /**
     * 朝向头部计算目标位置
     */
    private _alwaysHeader(index: number, target: Group<any>) {
        var size = 0
        var start = index
        var header = this.adapter.viewManager.header
        if (header) {
            size = this.adapter.viewManager.internal_getInitHeaderSize(header.group)
            start = header.index
        }
        if (index != start) {
            size = this._calcSizeToHeader(start, index, size)
        }
        return {
            position: this.adapter.viewManager.internal_convertSizeToHeaderPosition(size, target),
            size: target.size[this.adapter.mainAxis],
            anchor: target.anchorPoint[this.adapter.mainAxis]
        }
    }
    /**
     * 朝向尾部计算目标位置
     * @returns 
     */
    private _alwaysFooter(index: number, target: Group<any>) {
        var size = 0
        var start = index
        var footer = this.adapter.viewManager.footer
        if (footer) {
            size = this.adapter.viewManager.internal_getInitFooterSize(footer.group)
            start = footer.index
        }
        if (index != start) {
            size = this._calcSizeToFooter(start, index, size)
        }
        return {
            position: this.adapter.viewManager.internal_convertSizeToFooterPosition(size, target),
            size: target.size[this.adapter.mainAxis],
            anchor: target.anchorPoint[this.adapter.mainAxis]
        }
    }
    /**
     * 倒序累计尺寸，直到找到目标为止
     */
    private _calcSizeToHeader(index: number, targetIndex: number, size: number) {
        do {
            index--
            if (index < 0) {
                if (!this.adapter.viewManager.loopHeader) {
                    return size
                }
                index = this.adapter.viewManager.groupLength - 1
            }
            size += this.adapter.viewManager.internal_accumulationSize(index)
            if (targetIndex == index) return size
        } while (true)
    }
    /**
     * 正序累计尺寸，直到找到目标为止
     */
    private _calcSizeToFooter(index: number, targetIndex: number, size: number) {
        do {
            index++
            if (index >= this.adapter.viewManager.groupLength) {
                if (!this.adapter.viewManager.loopFooter) {
                    return size
                }
                index = 0
            }
            size += this.adapter.viewManager.internal_accumulationSize(index)
            if (index == targetIndex) return size
        } while (true)
    }
}

