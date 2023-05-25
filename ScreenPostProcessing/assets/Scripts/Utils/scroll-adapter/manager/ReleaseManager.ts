// import { _decorator, Component, Node } from 'cc';
import { Manager } from '../abstract/Manager';
import { ReleaseState } from '../define/enum';
import { ScrollManager } from './ScrollManager';
const { ccclass, property } = cc._decorator;
enum Event {
    ON_PULL_UP,
    ON_PULL_DOWN,
    ON_PULL_LEFT,
    ON_PULL_RIGHT,
}
@ccclass('ReleaseManager')
export class ReleaseManager extends Manager<Event> {
    static Event = Event
    @property() private _enabled: boolean = false
    @property() get enabled() { return this._enabled }
    set enabled(value: boolean) {
        if (value == this._enabled) return
        this._enabled = value
    }
    @property({
        range: [0, 1],
        slide: true,
        step: 0.01,
        visible: function () { return this.enabled },
        tooltip: "根据此阈值来切换state状态"
    }) left: number = 0

    @property({
        range: [0, 1],
        slide: true,
        step: 0.01,
        visible: function () { return this.enabled },
        tooltip: "根据此阈值来切换state状态"
    }) right: number = 0

    @property({
        range: [0, 1],
        slide: true,
        step: 0.01,
        visible: function () { return this.enabled },
        tooltip: "根据此阈值来切换state状态"
    }) top: number = 0

    @property({
        range: [0, 1],
        slide: true,
        step: 0.01,
        visible: function () { return this.enabled },
        tooltip: "根据此阈值来切换state状态"
    }) bottom: number = 0
    private _pullUp: ReleaseEvent
    private _pullDown: ReleaseEvent
    private _pullLeft: ReleaseEvent
    private _pullRight: ReleaseEvent
    get max() {
        if (!this.enabled) return 0
        if (this.adapter.isHorizontal) {
            return this._pullLeft ? this._pullLeft.expand : 0
        } else {
            return this._pullDown ? this._pullDown.expand : 0
        }
    }
    get min() {
        if (!this.enabled) return 0
        if (this.adapter.isHorizontal) {
            return this._pullRight ? this._pullRight.expand : 0
        } else {
            return this._pullUp ? this._pullUp.expand : 0
        }
    }

    protected onInit(): void {
        if (!this.enabled) return
        this._pullUp = new ReleaseEvent(this, Event.ON_PULL_UP, this.bottom)
        this._pullDown = new ReleaseEvent(this, Event.ON_PULL_DOWN, this.top)
        this._pullLeft = new ReleaseEvent(this, Event.ON_PULL_LEFT, this.right)
        this._pullRight = new ReleaseEvent(this, Event.ON_PULL_RIGHT, this.left)
        this.adapter.scrollManager.on(ScrollManager.Event.ON_SCROLL_START, this.onScrollStart, this)
        this.adapter.scrollManager.on(ScrollManager.Event.ON_SCROLL_END, this.onScrollEnd, this)
        this.adapter.scrollManager.on(ScrollManager.Event.ON_SCROLL_CANCEL, this.onScrollEnd, this)
        this.checkLoop()
    }
    private checkLoop() {
        if (this.adapter.isHorizontal) {
            if (this.adapter.isArrangeAxisStart) {
                if (this.left > 0) {
                    this.adapter.viewManager.loopHeader = false
                }
                if (this.right > 0) {
                    this.adapter.viewManager.loopFooter = false
                }
            } else {
                if (this.left > 0) {
                    this.adapter.viewManager.loopFooter = false
                }
                if (this.right > 0) {
                    this.adapter.viewManager.loopHeader = false
                }
            }
        } else {
            if (this.adapter.isArrangeAxisStart) {
                if (this.top > 0) {
                    this.adapter.viewManager.loopHeader = false
                }
                if (this.bottom > 0) {
                    this.adapter.viewManager.loopFooter = false
                }
            } else {
                if (this.top > 0) {
                    this.adapter.viewManager.loopFooter = false
                }
                if (this.bottom > 0) {
                    this.adapter.viewManager.loopHeader = false
                }
            }
        }
    }
    private onScrollStart() {
        if (this.adapter.isHorizontal) {
            if (this.left > 0) {
                this._pullRight["_setState"](ReleaseState.IDLE)
            }
            if (this.right > 0) {
                this._pullLeft["_setState"](ReleaseState.IDLE)
            }
        } else {
            if (this.top > 0) {
                this._pullDown["_setState"](ReleaseState.IDLE)
            }
            if (this.bottom > 0) {
                this._pullUp["_setState"](ReleaseState.IDLE)
            }
        }
    }
    private onScrollEnd() {
        if (this.adapter.isHorizontal) {
            if (this.left > 0) {
                this._pullRight["_setState"](ReleaseState.RELEASE)
            }
            if (this.right > 0) {
                this._pullLeft["_setState"](ReleaseState.RELEASE)
            }
        } else {
            if (this.top > 0) {
                this._pullDown["_setState"](ReleaseState.RELEASE)
            }
            if (this.bottom > 0) {
                this._pullUp["_setState"](ReleaseState.RELEASE)
            }
        }
    }
    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_lateUpdate(deltaTime: number) {
        if (!this.enabled) return
        var offset = this.adapter.scrollManager.boundaryOffset
        if (!this.adapter.scrollManager.dragging) {
            offset = 0
        }
        if (this.adapter.isHorizontal) {
            if (this.left > 0) {
                this._pullRight["_set"](Math.max(-offset, 0), offset < 0)
            }
            if (this.right > 0) {
                this._pullLeft["_set"](Math.max(offset, 0), offset > 0)
            }
        } else {
            if (this.top > 0) {
                this._pullDown["_set"](Math.max(offset, 0), offset > 0)
            }
            if (this.bottom > 0) {
                this._pullUp["_set"](Math.max(-offset, 0), offset < 0)
            }
        }
    }

}
/** 事件参数 */
export class ReleaseEvent {
    private _expand: number = 0
    get expand() { return this._expand }
    private _progress: number = 0
    private _offset: number = 0
    private _state: ReleaseState
    get progress() { return this._progress }
    get offset() { return this._offset }
    get state() { return this._state }
    private _defaultPercentage: number
    private _manager: ReleaseManager
    private _event: Event
    private _stop: boolean
    constructor(manager: ReleaseManager, event: Event, defaultPercentage: number) {
        this._defaultPercentage = defaultPercentage
        this._manager = manager
        this._event = event
    }
    private _set(offset: number, isContinue: boolean) {
        if (isContinue) {
            this._stop = false
        }
        if (this._stop) return
        this._offset = offset
        this._progress = offset / (this._defaultPercentage * this._manager.adapter.mainAxisSize)
        this._stop = this._offset <= 0.1
        this._setState(ReleaseState.PULL)
        this._manager.emit(this._event, this)
    }
    private _setState(value: ReleaseState) {
        if (this._state == ReleaseState.WAIT) {
            return
        }
        if (value == ReleaseState.PULL && this._state == ReleaseState.RELEASE) {
            return
        }
        this._state = value
    }
    /**
     * 等待
     * @param expandSize 扩展尺寸
     */
    public wait(expandSize: number = this._defaultPercentage * this._manager.adapter.mainAxisSize) {
        this._expand = expandSize
        this._state = ReleaseState.WAIT
    }
    /**
     * 释放
     */
    public release() {
        this._expand = 0
        this._state = ReleaseState.IDLE
        if (this.offset <= 0.1) {
            this._offset = 0
            this._progress = 0
            this._manager.emit(this._event, this)
        }
    }
}