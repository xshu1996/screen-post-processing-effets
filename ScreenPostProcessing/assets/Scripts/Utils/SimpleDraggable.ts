const { ccclass } = cc._decorator;

@ccclass
export default class SimpleDraggable extends cc.Component
{
    protected _touchOffset: cc.Vec2 = cc.Vec2.ZERO;
    protected _isDragging: boolean = false;
    protected _moveCallback: (pos: cc.Vec2) => void = null;

    protected onLoad(): void
    {
        this._addEvent();
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
        this._moveCallback && this._moveCallback(this.node.getPosition());
    }

    protected onTouchMove(e: cc.Event.EventTouch): void
    {
        if (!this._isDragging)
            return;

        let touchWorldPos = e.getLocation();
        this.traceTouchPos(touchWorldPos);
        this._moveCallback && this._moveCallback(this.node.getPosition());
    }

    protected onTouchEnd(e: cc.Event.EventTouch): void
    {
        if (!this._isDragging)
            return;

        this._isDragging = false;
    }

    protected traceTouchPos(worldPos: cc.Vec2)
    {
        let nodeWorldPos = worldPos.add(this._touchOffset);
        let localPos = this.node.parent.convertToNodeSpaceAR(nodeWorldPos);
        this.node.setPosition(localPos);
    }

    private _addEvent(): void
    {
        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart.bind(this));
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove.bind(this));
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd.bind(this));
        this.node.on(cc.Node.EventType.TOUCH_CANCEL, this.onTouchEnd.bind(this));
    }
}
