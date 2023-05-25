import { ScrollAdapter } from './ScrollAdapter';
const { ccclass, property } = cc._decorator;
interface IResult {
    params: any[]
    return: any
}
interface EventInfo {
    callback: Function
    target: any
    once: boolean
}
export interface IParams {
    [key: number | string]: IResult
}
@ccclass('Manager')
export abstract class Manager<TEvent extends number | string = any, TParams extends IParams = any> {
    private _inited: boolean = false
    private _eventMap: Map<TEvent, EventInfo[]> = new Map()

    private _adapter: ScrollAdapter | null = null
    get adapter() { return this._adapter }

    protected abstract onInit(): void

    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_create(adapter: ScrollAdapter) {
        this._adapter = adapter
    }
    /** @deprecated 内部方法，调用会爆炸💥 */
    public internal_init() {
        if (this._inited) return
        this._inited = true
        this.onInit()
    }
    public on(event: TEvent, callback: (...params: TParams[TEvent]["params"]) => TParams[TEvent]["return"], target: any, once = false) {
        if (!this._eventMap.has(event)) {
            this._eventMap.set(event, [])
        }
        var list = this._eventMap.get(event)
        if (list && list.find(info => info.target == target && info.callback == callback)) {
            return
        }
        list.push({ callback, target, once })
    }
    public off(event: TEvent, callback: any, target: any) {
        if (!this._eventMap.has(event)) {
            return
        }
        var list = this._eventMap.get(event)
        var index = list && list.findIndex(info => info.callback == callback && info.target == target)
        if (index == -1) return
        list.splice(index, 1)
    }
    public emit<M extends TEvent, N extends keyof TParams[M]>(event: M, ...params: TParams[M]["params"]): void {
        if (!this._eventMap.has(event)) {
            return
        }
        var list = this._eventMap.get(event)
        for (let i = 0; i < list.length; i++) {
            const info = list[i];
            info.callback.call(info.target, ...params)
            if (info.once) {
                list.splice(i, 1)
                i--
            }
        }
    }
}

