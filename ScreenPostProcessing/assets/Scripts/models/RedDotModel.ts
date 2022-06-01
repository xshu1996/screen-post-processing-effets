import { CallBack } from "../Utils/CallBack";
import { CallLater } from "../Utils/CallLater";
import { EventMgr } from "../Utils/EventMgr";
import { EventNotify } from "../Utils/EventNotify";

/** 红点模型
 * 关键数据为 state和isRedDot 字段 ， 也可通过此model的Laya.Event.CHANGE事件来监听isRedDot的变化。（注意移除）
 * <p>可通过setupCheckMethod配置检测方法
 * <p>在调用refresh时，会启用检测方法来设置红点值
 * <p>也可配置加入常用的公共事件（道具更新或指定其它事件类型），监听后会自动调用refresh方法。
 * <p>红点模型还有另外一种形态-组合功能： 即可通过child的相关方法， 加入或移除子级红点模型，
 * 当子级中有红点变化时，会自动归纳到本级的红点状态中来
 * @author xshu
 */
export class RedDotModel extends cc.EventTarget
{
    /** 保存所有红点数据，便于分析 */
    public static allRedDotMap = new Map<string, RedDotModel>();
    /** 唯一ID */
    private static _sn = 0;
    private _sn = 0;
    public get sn(): number
    {
        return this._sn;
    }
    constructor(isInstance = true)
    {
        super();
        this.isInstance = isInstance;
        this._sn = RedDotModel._sn++;
        RedDotModel.allRedDotMap.set(this._sn + "", this);
    }

    /** 是否为常驻的 */
    public isInstance = true;

    /** 调试用 */
    public isDestroy = false;
    /** 首次绑定的父级 */
    public parentSn = 0;

    ////////////////////////////// base ////////////////////////////
    protected _state: number = 0;
    /** 当前红点状态(0-无红点  有数字表示红点数量，通常为1表示有红点即可，少量有需要数量的) */
    public get state(): number
    {
        if (!this._isOpen) return 0;
        return this._state;
    }
    /** 当前是否有红点 */
    public get isRedDot(): boolean
    {
        return this._isOpen && this._state > 0;
    }

    public setRedDot(value: number): void
    {
        if (!this._isOpen) { value = 0; }
        if (value == this._state) { return; }
        this._state = value;
        this.emit(EventNotify.RED_DOT_CHANGED, this);
    }


    /** 刷新红点状态 */
    public refresh(isChildren: boolean = false): void
    {
        if (this.isDestroy)
        {
            console.log("refresh red dot is Destroy !!!!!!!!!!!!!!!!!!", this.sn, this.parentSn, this.bindData);
            return;
        }
        if (!this._isOpen) { return; }
        let redDot: number = 0;
        if (this._checkMethod) 
        { 
            redDot = this._checkMethod.call(this) ? 1 : 0; 
        }

        if (redDot == 0 && this._childModes.length > 0)
        {
            if (isChildren)
            {
                for (let el of this._childModes)
                {
                    el.refresh(true);
                }
            }
            this.sumUpAllChildModel();
        }
        else
        {
            this.setRedDot(redDot);
        }
    }

    private _checkMethod: CallBack;
    /** 
     * 配置外部检测红点的方法，在监听到有红点关随的事情触发时，会自动调用此方法
     * 注：此方法必须配备返回值为 number or boolean, 表示该红点模型的红点状态
     */
    public setupCheckMethod(caller: any, method: Function): void
    {
        this._checkMethod = new CallBack(caller, method);
        this.refresh();
    }

    protected _isOpen: boolean = true;

    /** 
     * 红点开关，受功能开放的影响，有时红点模型需要关闭（或者说是未开放）
     * 注： 外部调用此方法时，请注意与 setSystemSwitchId 的冲突。
     */
    public setOpenState(isOpen: boolean): void
    {
        if (this._isOpen == isOpen) 
        { 
            return; 
        }
        this._isOpen = isOpen;
        if (isOpen)
        {
            // this.pauseAllGlobalEvents(false);
            this.refresh();
        } else
        {
            this.setRedDot(0);
            // this.pauseAllGlobalEvents();
        }
    }

    /** 红点模型上绑定的数据， 各模块自行支配此字段内容 */
    public bindData: any;

    ////////////////////////////// 子级红点////////////////////////////

    /** 子级红点模型列表（map与array同步，简化遍历效率） */
    protected _childModes: Array<RedDotModel> = [];
    protected _childModesMap = new Map<string | number, RedDotModel>();
    /** 
     * 添加子级红点模型引用
     * @param key 子级的 key
     * @param model 外部配置的 model, 传入 null 时会自动分配一个
     * @param bindData 绑定数据，未传值时默认使用 key 为绑定数据， 也就是如果 bindData 的 key 是一样时，此值可不传, 当使用外部传入的model时，此值将失效
     */
    public addChildModel(key: string | number, model: RedDotModel = null, bindData: any = null): RedDotModel
    {
        let mapKey = key + "";
        if (this._childModesMap.get(mapKey)) 
        { 
            return this._childModesMap.get(mapKey); 
        }

        if (!model)
        {
            model = new RedDotModel();
            model.parentSn = this.sn;
            model.bindData = (bindData != null) ? bindData : key;
        }
        this._childModes.push(model);
        this._childModesMap.set(mapKey, model);
        model.on(EventNotify.RED_DOT_CHANGED, this.onChildRedDotChange, this);
        if (model.isRedDot && !this.isRedDot)
        {
            this.setRedDot(1);
        } 
        // 只需检测从无到有
        // CallLater.I.callLater(this, this.sumUpAllChildModel);
        return model;
    }
    /** 移除子级红点模型引用 */
    public removeChildModel(key: string | number, isDestroy: boolean = false, isDestroyChildren: boolean = true): RedDotModel
    {
        let model = this._childModesMap.get(key + "");
        if (!model)
        {
            return null;
        }
        let index = this._childModes.indexOf(model);
        if (index < 0)
        {
            // 监视，不应该存的异常
            console.warn("!!!!!!!!!!");
        }  
        this._childModes.splice(index, 1);
        this._childModesMap.delete(key + "");
        if (model.isRedDot) 
        { 
            this.sumUpAllChildModel(); 
        }  
        // 移掉了带红点的，才需要重置一次， 本身没红点的，移了就移了，无影响
        CallLater.I.callLater(this, this.sumUpAllChildModel);
        if (isDestroy)
        {
            model.destroy(isDestroyChildren);
        }
        else
        {
            model.off(EventNotify.RED_DOT_CHANGED, this.onChildRedDotChange, this);
        }
        return model;
    }

    public getChildModel(key: string | number): RedDotModel | null
    {
        return this._childModesMap.get(key + "");
    }

    protected onChildRedDotChange(): void
    {
        if (!this._isOpen)
        {
            return;
        }
        // this.sumUpAllChildModel();
        CallLater.I.callLater(this, this.sumUpAllChildModel);
    }

    /** 归纳子级红点模型状态到本类中 */
    protected sumUpAllChildModel(): void
    {
        if (!this._isOpen) { return; }
        // 考虑到红点变更的消息推送频繁程度，仅统计有和无即可，如果有需要呈现数字的，再另行处理
        let dotCount = 0; 
        for (let el of this._childModes)
        {
            if (el.isRedDot)
            {
                dotCount = 1;
                break;
            }
        }
        this.setRedDot(dotCount);
    }

    /** 刷新指定子级 */
    public refreshChild(key: string | number, refreshChild: boolean = false): void
    {
        let child = this.getChildModel(key);
        if (child) { child.refresh(refreshChild); }
    }
    /** 获取指定子级的红点状态(简化常用运算) */
    public getChildRedDotState(key: string | number): boolean
    {
        let child = this.getChildModel(key);
        if (child) 
        { 
            return child.isRedDot; 
        }
        return false;
    }


    ////////////////////////////// 全局事件监听, 封装一些常见的红点监控类型， 自行维护红点值 ////////////////////////////
    private _eventMgrDic: Map<string, CallBack>;
    private _listenPlayerItemIds: number[];
    /** 增加道具与消耗品的监听, 有对应道具数量变化时，会自动调用refresh，启用setupCheckMethod传入的方法进行检查红点状态 */
    public setPlayerItemsListener(itemIds: number[]): void
    {
        this._listenPlayerItemIds = itemIds;
        if (itemIds && itemIds.length > 0)
        { 
            this.__addGlobalEventListener(EventNotify.PLAYER_ITEM_VAL_CHANGED, this.onPlayerItemNumChange, this); 
        }
        else
        { 
            this.removeGlobalEventListener(EventNotify.PLAYER_ITEM_VAL_CHANGED); 
        }
    }
    /** 
     * 增加道具与消耗品的监听, 有对应道具数量变化时，会自动调用refresh，启用setupCheckMethod传入的方法进行检查红点状态 
     */
    public setPlayerItemInfosListener(addItemInfos: { itemID: number, itemCount: number }[]): void
    {
        let itemIds: number[] = [];
        addItemInfos = addItemInfos || [];
        for (let el of addItemInfos)
        {
            itemIds.push(el.itemID);
        }
        this.setPlayerItemsListener(itemIds);
    }

    /** 
     * 增加全局事件变化监听，当接收到此事件时，会自动调用refresh，启用setupCheckMethod传入的方法进行检查红点状态
     * @param eventType 监听的全局事件类型
     * @param checkParam 监听事件回调时， 检查此参数与事件携带的参数是否一致, 
     * 注： 使用此参数接口时，请保障此参数的类型与全局事件传递的类型是否一致。
     */
    public addGlobalEventRefresh(eventType: string | number, checkParam = null): void
    {
        this.__addGlobalEventListener(eventType, this.callLaterRefresh, this, checkParam);
    }

    /** 增加全局事件监听 */
    private __addGlobalEventListener(eventType: string | number, func: Function, caller: any, checkParam = null): void
    {
        if (!this._eventMgrDic) 
        { 
            this._eventMgrDic = new Map<string, CallBack>(); 
        }
        if (this._eventMgrDic.has(eventType + "")) return;

        let funcParam = checkParam == null ? func : (param) =>
        {
            if (checkParam == param) 
            { 
                func.call(caller, param); 
            }
        };
        this._eventMgrDic.set(eventType + "", new CallBack(caller, funcParam));
        if (!this._pauseGlobalEvents)
        {
            EventMgr.instance.on(eventType + "", funcParam, caller);
        }
    }
    /** 移除全局事件监听 */
    public removeGlobalEventListener(eventType: string | number): void
    {
        if (!this._eventMgrDic || !this._eventMgrDic.has(eventType + "")) return;

        let cb: CallBack = this._eventMgrDic.get(eventType + "");
        this._eventMgrDic.delete(eventType + "");
        EventMgr.instance.off(eventType + "", cb.handler, cb.caller);
    }

    public removeAllGlobalEvents(): void
    {
        if (!this._eventMgrDic) return;
        let keys = Array.from(this._eventMgrDic.keys());
        for (let key of keys)
        {
            let cb: CallBack = this._eventMgrDic.get(key);
            EventMgr.instance.off(key, cb.handler, cb.caller);
        }
        this._eventMgrDic.clear();
        this._eventMgrDic = null;
    }

    private _pauseGlobalEvents = false;
    /** 暂停全局事件监听(并非移除) */
    public pauseAllGlobalEvents(isPause: boolean = true): void
    {
        if (this._pauseGlobalEvents == isPause) return;
        this._pauseGlobalEvents = isPause;
        if (!this._eventMgrDic) return;
        let keys = Array.from(this._eventMgrDic.keys());
        for (let key of keys)
        {
            let cb: CallBack = this._eventMgrDic.get(key);
            if (isPause) 
            { 
                EventMgr.instance.off(key, cb.handler, cb.caller); 
            }
            else 
            { 
                EventMgr.instance.on(key, cb.handler, cb.caller); 
            }
        }
    }


    private _systemSwitchId: number = -1;
    /** 
     * 绑定系统功能开放id
     * 注： 此值会直接影响OpenState的值， 外部如果有自行配置setOpenState时，请注意冲突。
     */
    public setSystemSwitchId(systemId: number): void
    {
        let isOpen = true; // TODO add yourself check system open state function
        this.setOpenState(isOpen);
        if (!isOpen)
        { 
            // 如果没有开放，则监听系统开放事件，直接开放为止
            this._systemSwitchId = systemId;
            this.__addGlobalEventListener(EventNotify.SYSTEM_SWITCH_OPEN_UPDATE, this.onUpdateSystemSwitch, this);
        }
    }

    /** 全局系统功能开放 */
    private onUpdateSystemSwitch(systemId: number): void
    {
        if (systemId == this._systemSwitchId)
        {
            this._systemSwitchId = 0;
            this.setOpenState(true);
            this.removeGlobalEventListener(EventNotify.SYSTEM_SWITCH_OPEN_UPDATE);
        }
    }

    /** 全局道具变化 */
    private onPlayerItemNumChange(fID: number): void
    {
        if (!this._isOpen) return;
        if (this._listenPlayerItemIds.indexOf(fID) >= 0)
        {
            this.callLaterRefresh();
        }
    }

    private callLaterRefresh(): void
    {
        if (this.isDestroy)
        {
            console.warn("callLaterRefresh reddot is Destroy !!!!!!!!!!!!!!!!!!", this.sn);
            return;
        }
        CallLater.I.callLater(this, this.refresh);
    }


    //////////////////////////////////////////////////////////////////////////////////////
    /** 清理 */
    public cleanUp(isDestroyChild: boolean = false): void
    {
        this.clear();
        for (let el of this._childModes)
        {
            if (isDestroyChild) 
            { 
                el.destroy(true); 
            }
            else 
            { 
                el.off(EventNotify.RED_DOT_CHANGED, this.onChildRedDotChange, this); 
            }

        }
        this.bindData = null;
        this._state = 0;
        this._systemSwitchId = 0;
        this._pauseGlobalEvents = false;
        this._childModes = [];
        this._childModesMap.clear();
        this.removeAllGlobalEvents();
    }

    public destroy(isDestroyChild: boolean): void
    {
        this.cleanUp(isDestroyChild);
        this.isDestroy = true;
        CallLater.I.clearAll(this);
        RedDotModel.allRedDotMap.delete(this.sn + "");
    }
}