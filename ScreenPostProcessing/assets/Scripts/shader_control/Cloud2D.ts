import { ShaderUtils } from "../Utils/ShaderUtils";

const { ccclass, property, menu, executeInEditMode, requireComponent } = cc._decorator;

@ccclass
@menu("shader/clouds")
@executeInEditMode
@requireComponent(cc.Sprite)
export default class Cloud2D extends cc.Component
{

    @property(cc.Slider)
    public barSpeed: cc.Slider = null;
    private _speed: number = 0.03;

    @property(cc.Slider)
    public barCloudScale: cc.Slider = null;
    private _cloudScale: number = 1.1;

    @property(cc.Slider)
    public barCloudAlpha: cc.Slider = null;
    private _cloudAlpah: number = 8;

    @property(cc.Slider)
    public barWith: cc.Slider = null;

    @property(cc.Slider)
    public barHeight: cc.Slider = null;

    @property(cc.Size)
    public _cloudResolution: cc.Size = cc.size(800, 450);

    @property
    public get cloudResolution(): cc.Size
    {
        return this._cloudResolution.clone();
    }

    public set cloudResolution(v: cc.Size)
    {
        this._cloudResolution = v;
        this.node.setContentSize(v);
        this._setSliderValue(this.barWith, v.width, [0, cc.view.getDesignResolutionSize().width], "宽度");
        this._setSliderValue(this.barHeight, v.height, [0, cc.view.getDesignResolutionSize().height], "高度");
    }

    private _render: cc.Sprite = null;

    onLoad() 
    {
        this._render = this.getComponent(cc.Sprite);
        this.enabled = cc.isValid(this._render);
    }

    start()
    {
        this._addEvent();
        this._setSliderValue(this.barSpeed, this._speed, [0, 0.5], "云速度");
        this._setSliderValue(this.barCloudAlpha, this._cloudAlpah, [0, 16], "云透明度");
        this._setSliderValue(this.barCloudScale, this._cloudScale, [0.1, 2], "云体积");
        this._setSliderValue(this.barWith, this.cloudResolution.width, [0, cc.view.getDesignResolutionSize().width], "宽度");
        this._setSliderValue(this.barHeight, this.cloudResolution.height, [0, cc.view.getDesignResolutionSize().height], "高度");
    }

    protected onEnable(): void
    {
        if (!cc.isValid(this._render.spriteFrame))
        {
            let singleTex = ShaderUtils.genSingleTexture();
            singleTex.packable = false;
            let spf = new cc.SpriteFrame(singleTex);
            this._render.spriteFrame = spf;
            this.node.setContentSize(this._cloudResolution);
        }
    }

    protected onDisable(): void
    {

    }

    private _addEvent(): void
    {
        this.barSpeed.handle.node.on(cc.Node.EventType.TOUCH_END, () =>
        {
            let speed = this.barSpeed.progress * 0.5;
            this._setSliderValue(this.barSpeed, speed, [0, 0.5], "云速度");
            this._render.getMaterial(0).setProperty("speed", speed);
        }, this);

        this.barCloudAlpha.handle.node.on(cc.Node.EventType.TOUCH_END, () =>
        {
            let alpha = this.barCloudAlpha.progress * 16;
            this._setSliderValue(this.barCloudAlpha, alpha, [0, 16], "云透明度");
            this._render.getMaterial(0).setProperty("cloudAlpha", alpha);
        }, this);

        this.barCloudScale.handle.node.on(cc.Node.EventType.TOUCH_END, () =>
        {
            let scale = this.barCloudScale.progress * (2 - 0.1) + 0.1;
            this._setSliderValue(this.barCloudScale, scale, [0.1, 2], "云体积");
            this._render.getMaterial(0).setProperty("cloudScale", scale);
        }, this);

        this.barWith.handle.node.on(cc.Node.EventType.TOUCH_END, () =>
        {
            let width = this.barWith.progress * cc.view.getDesignResolutionSize().width;
            this.cloudResolution = cc.size(width, this.cloudResolution.height);
        }, this);

        this.barHeight.handle.node.on(cc.Node.EventType.TOUCH_END, () =>
        {
            let height = this.barHeight.progress * cc.view.getDesignResolutionSize().height;
            this.cloudResolution = cc.size(this.cloudResolution.width, height);
        }, this);
    }

    private _setSliderValue(slider: cc.Slider, val: number, range: number[], prefix: string = ""): void
    {
        let labVal: cc.Label = slider.node.getChildByName("LabSliderVal")?.getComponent(cc.Label);
        labVal.string = `${prefix}:range:[${range[0]}/${range[1]}], ${val.toFixed(2)} `;
        let progress = (val - range[0]) / (range[1] - range[0]);
        if (slider.progress !== progress) slider.progress = progress;
    }
}
