// import { _decorator, EventTouch } from 'cc';
import { Manager } from '../abstract/Manager';
import { AlwaysScroll } from '../define/enum';
import { ScrollManager } from './ScrollManager';
import { ViewManager } from './ViewManager';
const { ccclass, property } = cc._decorator;
enum Event {
    /** 分页的长度变更时 */
    ON_PAGE_LENGTH_CHANGED,
    /** 滚动分页开始时 */
    ON_SCROLL_PAGE_BEFOR,
    /** 滚动分页结束时 */
    ON_SCROLL_PAGE_END,
}
@ccclass('PageViewManager')
export class PageViewManager extends Manager<Event> {
    public static Event = Event
    @property() private _enabled: boolean = false
    @property() get enabled() { return this._enabled }
    set enabled(value: boolean) {
        if (value == this._enabled) return
        this._enabled = value
        if (this._enabled) {
            this._register()
        } else {
            this._unregister()
        }
    }
    @property({
        range: [0, 1],
        slide: true,
        step: 0.01,
        visible: function () { return this.enabled },
        tooltip: "滚动临界值，默认单位百分比，当拖拽超出该数值时，松开会自动滚动下一页，小于时则还原"
    }) scrollThreshold: number = 0.5

    @property({
        range: [0, 1],
        slide: true,
        step: 0.01,
        visible: function () { return this.enabled },
        tooltip: "设置 PageView PageTurning 事件的发送时机"
    }) pageTurningEventTiming: number = 0.1

    @property({
        visible: function () { return this.enabled },
        tooltip: `快速滑动翻页临界值
        当用户快速滑动时，会根据滑动开始和结束的距离与时间计算出一个速度值
        该值与此临界值相比较，如果大于临界值，则进行自动翻页`
    }) autoPageTurningThreshold: number = 100

    @property({
        visible: function () { return this.enabled },
        tooltip: "每个页面翻页时所需时间。单位：秒"
    }) pageTurningSpeed: number = 0.3
    private _currentIndex: number = 0
    get currentIndex() { return this._currentIndex }
    get length() { return this.adapter.viewManager.groupLength }
    protected onInit(): void {
        this._register()
    }
    private _register() {
        if (!this.adapter || !this.enabled) return
        this.adapter.scrollManager.on(ScrollManager.Event.ON_SCROLL_END, this._handleReleaseLogic, this)
        this.adapter.scrollManager.on(ScrollManager.Event.ON_SCROLL_CANCEL, this._handleReleaseLogic, this)
        this.adapter.scrollManager.on(ScrollManager.Event.ON_SCROLL_TO_GROUPINDEX_BEFOR, this._onScrollToIndex, this)
        this.adapter.viewManager.on(ViewManager.Event.ON_UPDATE_VIEWS, this._onUpdateViews, this, true)
    }
    private _unregister() {
        if (!this.adapter || this.enabled) return
        this.adapter.scrollManager.off(ScrollManager.Event.ON_SCROLL_END, this._handleReleaseLogic, this)
        this.adapter.scrollManager.off(ScrollManager.Event.ON_SCROLL_CANCEL, this._handleReleaseLogic, this)
        this.adapter.scrollManager.off(ScrollManager.Event.ON_SCROLL_TO_GROUPINDEX_BEFOR, this._onScrollToIndex, this)
        this.adapter.viewManager.off(ViewManager.Event.ON_UPDATE_VIEWS, this._onUpdateViews, this)
    }
    public scrollToPage(duration: number, index: number, alwaysScroll?: AlwaysScroll) {
        if (index < 0 || index >= this.length) {
            return
        }
        if (index == this.currentIndex && this.adapter.scrollManager.calcOffset() != 0) {
            return
        }
        this.adapter.scrollManager.scrollToGroupIndex(duration, index, alwaysScroll)
        this.emit(Event.ON_SCROLL_PAGE_BEFOR, index)
    }
    /**
     * 滚动到上一页
     * @param duration 持续时间
     * @param alwaysScrollToHeader 强制向头部滚动
     */
    public scrollToPrevPage(duration: number = this.pageTurningSpeed, alwaysScroll: AlwaysScroll = AlwaysScroll.Header) {
        if (this._currentIndex == 0) {
            if (this.adapter.viewManager.loopHeader) {
                this.scrollToPage(duration, this.length - 1, alwaysScroll)
            }
            return
        }
        this.scrollToPage(duration, this._currentIndex - 1, alwaysScroll)
    }
    /**
     * 滚动到下一页
     * @param duration 持续时间
     * @param alwaysScrollToFooter 强制向尾部滚动
     */
    public scrollToNextPage(duration: number = this.pageTurningSpeed, alwaysScroll: AlwaysScroll = AlwaysScroll.Footer) {
        if (this._currentIndex >= this.length - 1) {
            if (this.adapter.viewManager.loopFooter) {
                this.scrollToPage(duration, 0, alwaysScroll)
            }
            return
        }
        this.scrollToPage(duration, this._currentIndex + 1, alwaysScroll)
    }
    private _onUpdateViews() {
        this.emit(Event.ON_PAGE_LENGTH_CHANGED)
        this._currentIndex = 0
        this.scrollToPage(this.pageTurningSpeed, this._currentIndex)
    }
    private _onScrollToIndex(index: number) {
        this._currentIndex = index
        this.emit(Event.ON_SCROLL_PAGE_END, index)
    }
    private _handleReleaseLogic(event: cc.Event.EventTouch) {
        if (!this._enabled || !this.adapter.scrollManager.isMyEventAndMoved) return
        var start = event.getStartLocation()[this.adapter.mainAxis]
        var end = event.getLocation()[this.adapter.mainAxis]
        var offset = start - end
        var nextIndex = this._getNextIndex(offset)
        if (this._isScrollable(offset) || this._isQuicklyScrollable(this.adapter.scrollManager.velocity)) {
            this.scrollToPage(this.pageTurningSpeed, nextIndex)
            return
        }
        this.scrollToPage(this.pageTurningSpeed, this._currentIndex)
    }

    private _getNextIndex(offset: number) {
        var index = this._currentIndex
        if (this.adapter.isHorizontal) {
            if (this.adapter.isArrangeAxisStart) {
                if (offset > 0) {
                    index++
                } else if (offset < 0) {
                    index--
                }
            } else {
                if (offset < 0) {
                    index++
                } if (offset > 0) {
                    index--
                }
            }

        } else {
            if (this.adapter.isArrangeAxisStart) {
                if (offset < 0) {
                    index++
                } else if (offset > 0) {
                    index--
                }
            } else {
                if (offset > 0) {
                    index++
                } else if (offset < 0) {
                    index--
                }
            }
        }
        if (index >= this.length && this.adapter.viewManager.loopFooter) {
            index = 0
        } else if (index < 0 && this.adapter.viewManager.loopHeader) {
            index = this.length - 1
        }

        if (index < 0 || index >= this.length) {
            index = this._currentIndex
        }
        return index
    }
    private _isScrollable(offset: number) {
        return Math.abs(offset) >= this.adapter.mainAxisSize * this.scrollThreshold
    }
    private _isQuicklyScrollable(touchMoveVelocity: number) {
        return Math.abs(touchMoveVelocity) > this.autoPageTurningThreshold
    }
}

