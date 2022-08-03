/**
 * @author xshu
 * @version 0.0.1
 * @description ...
 */

import { ScreenPostProcessing, EffectType } from "./ScreenPostProcessing";
import { MathUtils } from "./Utils/MathUtils";
import { ShaderUtils } from "./Utils/ShaderUtils";

const { ccclass, property, executeInEditMode } = cc._decorator;

const INTERACTION_UI_Z_INDEX = 1;

@ccclass
@executeInEditMode
class Main extends cc.Component
{
    @property(cc.Label)
    public repositoryAddress: cc.Label = null;

    @property(cc.Button)
    public p_btnShowPage: cc.Button = null;

    @property(cc.Toggle)
    public p_togRealTimeRendering: cc.Toggle = null;

    @property(cc.Toggle)
    public p_togGraphic: cc.Toggle = null;

    @property(cc.Slider)
    public p_sliderModifyParam: cc.Slider = null;

    @property(cc.ToggleContainer)
    public p_tgSelectEffect: cc.ToggleContainer = null;

    @property({
        type: cc.Sprite,
        tooltip: "shader 进度条"
    })
    public p_proText: cc.Sprite = null;

    @property({
        type: cc.Float,
        tooltip: "进度条速度"
    })
    public proSpeed: number = 5;

    @property([cc.Button])
    public btnProgressCtl: cc.Button[] = [];

    @property(cc.Graphics)
    public graph: cc.Graphics = null;

    private _renderList: cc.Node[] = [];

    private _progressIncrement: number = 0;

    private _curProgress: number = 0;

    public get curProgress(): number
    {
        return this._curProgress;
    }

    public set curProgress(v: number)
    {
        // -0.05 是振幅的大小，如果填0的话，当进度为0时还会出现波浪
        this._curProgress = cc.misc.clampf(v, -0.05, 1);
        if (this._curProgress === -0.05)
        {
            // this._progressIncrement = 0;
            this._progressIncrement = -this._progressIncrement;
        }
        if (this._curProgress === 1)
        {
            // this._progressIncrement = 0;
            this._progressIncrement = -this._progressIncrement;
        }
    }

    private _graPoints: cc.Vec2[] = [];

    protected onLoad(): void
    {
        this.p_btnShowPage.node.zIndex = INTERACTION_UI_Z_INDEX;
        this.p_togRealTimeRendering.node.zIndex = INTERACTION_UI_Z_INDEX;
        this.p_togGraphic.node.zIndex = INTERACTION_UI_Z_INDEX;
        this.p_sliderModifyParam.node.zIndex = INTERACTION_UI_Z_INDEX;
        this.p_tgSelectEffect.node.zIndex = INTERACTION_UI_Z_INDEX;

        this._refreshUIVisible();

        this._addUIEvent();
        this._progressIncrement = this.proSpeed;
    }

    private _addUIEvent(): void
    {
        this.p_btnShowPage.node.on('click', () =>
        {
            const recycleImg = ScreenPostProcessing.getRecycleShotTexture();
            const shotNode = ScreenPostProcessing.getSnapshotNode(cc.Canvas.instance.node, true, recycleImg);

            const dlg = new cc.Node('Dialog');
            shotNode.on(cc.Node.EventType.TOUCH_END, (event: cc.Event.EventTouch) =>
            {
                event.stopPropagation();
                dlg.destroy();
                let index: number = this._renderList.indexOf(shotNode);
                if (index >= 0) this._renderList.splice(index, 1);
            }, this);
            cc.director.getScene().addChild(dlg);
            dlg.setPosition(cc.v2(cc.visibleRect.width / 2, cc.visibleRect.height / 2));
            dlg.addChild(shotNode);
            if (this.p_togRealTimeRendering.isChecked)
            {
                this._renderList.push(shotNode);
            } else
            {
                // 把 BlurNormal.effect blurRadius 的值改的特别大， 执不执行下面这一行代码 FPS的差距就体现出来了
                ScreenPostProcessing.reRenderNode(shotNode);
            }
        }, this);

        this.p_sliderModifyParam.node.on('slide', (event) =>
        {
            let val: number = this.p_sliderModifyParam.progress * 8 - 4;
            ScreenPostProcessing.getInstance().p_mtlPencilSketch.setProperty('uIntensity', val);
        }, this);

        this.p_tgSelectEffect.toggleItems.forEach((ele, index) =>
        {
            ele.node.on('toggle', () =>
            {
                ScreenPostProcessing.setEffectType(index);
                this._refreshUIVisible();
            }, this);
        });

        this.btnProgressCtl.forEach((btn, idx) =>
        {
            btn.node.on("click", () =>
            {
                this._progressIncrement = (idx - 1) * this.proSpeed;
            }, this);
        });

        cc.Canvas.instance.node.on(cc.Node.EventType.TOUCH_MOVE, (e: cc.Touch) =>
        {
            if (!this.p_togGraphic.isChecked)
            {
                return;
            }
            let worldPos = e.getLocation();
            let nodePos = this.graph.node.convertToNodeSpaceAR(worldPos);
            this._graPoints.push(nodePos);
            this._graPoints = MathUtils.simplifyLightBar(this._graPoints, 5);
            this._drawTrack(this.graph, this._graPoints);
        }, this);

        this.repositoryAddress.node.on(cc.Node.EventType.TOUCH_END, () => {
            window.open(this.repositoryAddress.string);
        }, this);
    }

    private _refreshUIVisible(): void
    {
        this.p_sliderModifyParam.node.active = ScreenPostProcessing.getEffectType() === EffectType.PencilSketch;
    }

    protected update(dt: number): void
    {
        this._renderList.forEach(ele =>
        {
            let texture = ScreenPostProcessing.getRenderTextureFaster({
                renderNode: cc.Canvas.instance.node,
                frameSize: cc.size(Math.ceil(cc.visibleRect.width), Math.ceil(cc.visibleRect.height)),
                // 剔除指定节点不参与截图示例代码，要改节点的 group 属性， 使用完毕后可以通过 restoreNodeGroup 方法还原原先的group
                // cullGroupIndex: this.p_proText.node.groupIndex,
                // ignoreNodes: [this.p_proText.node, cc.Canvas.instance.node.getChildByName("ImgArrow")]
            });

            ele.getComponent(cc.Sprite).spriteFrame.setTexture(texture);
            if (ScreenPostProcessing.effectType === EffectType.Glitch)
            {
                let mtl = ele.getComponent(cc.Sprite).getMaterial(0);
                if (mtl.getDefine("USE_STRIP_NOISE_TEXTURE"))
                {
                    if (cc.director.getTotalFrames() % 3 == 0)
                        mtl.setProperty("stripNoiseTex", ShaderUtils.genColorNoiseRT(0.89, cc.size(20, 20)));
                }
            }
            ele.getComponent(cc.Sprite)["_updateMaterial"]();
        });

        if (this._progressIncrement !== 0)
        {
            this.curProgress += this._progressIncrement;
            this._controlProgress(this.curProgress);
        }
    }

    private _controlProgress(increment: number): void
    {
        if (!cc.isValid(this.p_proText)) return;
        const WAVE_MTL: cc.Material = this.p_proText.getMaterial(0);
        WAVE_MTL.setProperty("offset", increment);
        let spInfo = ShaderUtils.getUVOffset(this.p_proText.spriteFrame);
        WAVE_MTL.setProperty("uUVOffset", spInfo.uvOffset);
        WAVE_MTL.setProperty("uRotated", spInfo.isRotated);
    }

    private _drawTrack(g: cc.Graphics, points: cc.Vec2[]): void
    {
        if (!cc.isValid(g) || points.length < 2)
        {
            return;
        }

        g.clear();
        g.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; ++i)
        {
            g.lineTo(points[i].x, points[i].y);
        }
        g.stroke();
    }
}
export = Main;