/**
 * 事件管理单例类
 */
export class EventMgr extends cc.EventTarget
{
    private static _ins: EventMgr = null;
    public static get instance(): EventMgr
    {
        if (!this._ins)
        {
            this._ins = new EventMgr();
        }
        return this._ins;
    }
}