const { ccclass, property } = cc._decorator;

@ccclass
export default class ScreenRipple extends cc.Component
{

    @property(cc.Camera)
    cameraScreen: cc.Camera = null;

    @property(cc.Sprite)
    spOutput: cc.Sprite = null;

    _points_dis: number[][] = [];
    _waveSpeed: number = 25;
    _waveLength: number = 70;
    _waveWidth: number = 0.1;
    _waveStrength: number = 0.03;
    _waveStrengthFallFactor = 0.2;

    _material: cc.Material = null;

    onLoad()
    {
        let rt = new cc.RenderTexture();
        rt.initWithSize(cc.visibleRect.width, cc.visibleRect.height, cc.RenderTexture.DepthStencilFormat.RB_FMT_S8);
        this.cameraScreen.targetTexture = rt;
        let spf = new cc.SpriteFrame(rt);
        this.spOutput.spriteFrame = spf;

        this._material = this.spOutput.getMaterial(0);
    }

    start()
    {
        this.node.on(cc.Node.EventType.TOUCH_END, (event: cc.Event.EventTouch) =>
        {
            let worldPos = cc.v2(event.getLocation());
            let localPos = this.spOutput.node.convertToNodeSpaceAR(worldPos);
            this._points_dis.push([localPos.x / this.spOutput.node.width, 1 - localPos.y / this.spOutput.node.height, cc.director.getTotalTime()]);
            cc.director.getDeltaTime();
        }, this);

        this.node['_touchListener'].setSwallowTouches(false);
    }

    update(dt)
    {
        this._material.setProperty("_WaveSpeed", this._waveSpeed);
        this._material.setProperty("_Resolution", [this.spOutput.node.width, this.spOutput.node.height]);
        this._material.setProperty("_WaveLength", this._waveLength);
        this._material.setProperty("_WaveWidth", this._waveWidth);
        this._material.setProperty("_WaveStrength", this._waveStrength);
        this._material.setProperty("_WaveStrengthFallFactor", this._waveStrengthFallFactor);

        let data = new Float32Array(40).fill(0);
        for (let i = 0; i < data.length; i += 4)
        {
            if (i < this._points_dis.length * 4)
            {
                let row = i / 4 | 0;
                let col = i % 4;
                let timeDelta = (cc.director.getTotalTime() - this._points_dis[row][col + 2]) / 1000;
                if (timeDelta > 1)
                {
                    this._points_dis.splice(i / 4 | 0, 1);
                    continue;
                }
                data[i] = this._points_dis[row][col];
                data[i + 1] = this._points_dis[row][col + 1];
                data[i + 2] = 0.6 * timeDelta;
                data[i + 3] = 1;
            }
        }
        this._material.setProperty("_WaveInfo", data);
    }
}
