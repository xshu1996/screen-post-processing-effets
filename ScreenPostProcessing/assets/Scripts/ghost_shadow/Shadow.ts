
export default class Shadow extends cc.Node
{
    private _sprite: cc.Sprite;
    public isOver: boolean;
    private _life: number;
    private _opacitySpeed: number;
    // TODO: apply more shader
    public renderTexture: cc.RenderTexture;

    public init(life: number, startOpacity: number, opacitySpeed: number)
    {
        this._life = life;
        this._opacitySpeed = opacitySpeed;
        this.opacity = startOpacity;
        if (!cc.isValid(this._sprite))
        {
            this._sprite = this.addComponent(cc.Sprite);
        }
        if (!cc.isValid(this._sprite.spriteFrame))
        {
            this._sprite.spriteFrame = new cc.SpriteFrame();
            this._sprite.spriteFrame.setFlipY(true);
        }
        if (!cc.isValid(this.renderTexture))
        {
            this.renderTexture = new cc.RenderTexture();
            this._sprite.spriteFrame.setTexture(this.renderTexture);
        }
    }

    public update(dt)
    {
        if (this.isOver) return;
        if (this._life > 0)
        {
            this._life -= dt;
        }
        if (this._opacitySpeed)
        {
            this.opacity += Math.floor(this._opacitySpeed * dt);
        }

        this.isOver = this._life <= 0 || this.opacity <= 0;
    }

    public recover()
    {
        // TODO: recover to the pool
        this.removeFromParent();
        this.isOver = null;
        this._life = null;
        this._opacitySpeed = null;
        if (cc.isValid(this.renderTexture))
        {
            this.renderTexture.clear();
        }
    }
}
