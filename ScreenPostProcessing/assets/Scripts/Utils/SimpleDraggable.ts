const { ccclass, disallowMultiple, menu } = cc._decorator;

@ccclass
@disallowMultiple
@menu("Utils/SimpleDrag")
export default class SimpleDraggable extends cc.Component
{
    protected _touchOffset: cc.Vec2 = cc.Vec2.ZERO;
    protected _isDragging: boolean = false;
    public get isDragging(): boolean
    {
        return this._isDragging;
    }

    protected _moveCallback: (pos: cc.Vec2) => void = null;

    protected onEnable(): void
    {
        this._addEvent();
    }

    protected onDisable(): void
    {
        this._removeEvent();
    }

    public setup(moveCallback: (pos: cc.Vec2) => void): void
    {
        this._moveCallback = moveCallback;
    }

    protected onTouchStart(e: cc.Event.EventTouch): void
    {
        let touchWorldPos = e.getLocation();
        let nodeWorldPos = this.node.convertToWorldSpaceAR(cc.Vec2.ZERO);
        this._touchOffset = nodeWorldPos.sub(touchWorldPos);
        this._isDragging = true;
        this.node.emit("start_drag");
        this._moveCallback && this._moveCallback(this.node.getPosition());
    }

    protected onTouchMove(e: cc.Event.EventTouch): void
    {
        if (!this.isDragging) return;

        let touchWorldPos = e.getLocation();
        this.traceTouchPos(touchWorldPos);
        this._moveCallback && this._moveCallback(this.node.getPosition());
    }

    protected onTouchEnd(e: cc.Event.EventTouch): void
    {
        if (!this.isDragging) return;

        this._isDragging = false;
        this.node.emit("end_drag");
    }

    protected traceTouchPos(worldPos: cc.Vec2): void
    {
        let nodeWorldPos = worldPos.add(this._touchOffset);
        let localPos = this.node.parent.convertToNodeSpaceAR(nodeWorldPos);
        this.node.setPosition(localPos);
    }

    private _addEvent(): void
    {
        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(cc.Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    private _removeEvent(): void
    {
        this.node.off(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(cc.Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }
}
