/**
 * @author xshu
 * @version 0.0.1
 * @description ...
 */

import { ScreenPostProcessing, EffectType } from "./ScreenPostProcessing";

const { ccclass, property } = cc._decorator;

const INTERACTION_UI_Z_INDEX = 1;

@ccclass
class Main extends cc.Component {

    @property(cc.Button)
    public p_btnShowPage: cc.Button = null;

    @property(cc.Toggle)
    public p_togRealTimeRendering: cc.Toggle = null;

    @property(cc.Slider)
    public p_sliderModifyParam: cc.Slider = null;

    @property(cc.ToggleContainer)
    public p_tgSelectEffect: cc.ToggleContainer = null;

    private _renderList: cc.Node[] = [];

    protected onLoad(): void {
        this.p_btnShowPage.node.zIndex = INTERACTION_UI_Z_INDEX;
        this.p_togRealTimeRendering.node.zIndex = INTERACTION_UI_Z_INDEX;
        this.p_sliderModifyParam.node.zIndex = INTERACTION_UI_Z_INDEX;
        this.p_tgSelectEffect.node.zIndex = INTERACTION_UI_Z_INDEX;

        this._refreshUIVisible();

        this._addUIEvent();
    }

    private _addUIEvent(): void {
        this.p_btnShowPage.node.on('click', () => {
            const recycleImg = ScreenPostProcessing.getRecycleShotTexture();
            const shotNode = ScreenPostProcessing.getScreenShotNode(cc.Canvas.instance.node, true, recycleImg);

            const dlg = new cc.Node('Dialog');
            shotNode.on(cc.Node.EventType.TOUCH_END, (event: cc.Event.EventTouch) => {
                event.stopPropagation();
                dlg.destroy();
                let index: number = this._renderList.indexOf(shotNode);
                if (index >= 0) this._renderList.splice(index, 1);
            }, this);
            cc.director.getScene().addChild(dlg);
            dlg.setPosition(cc.v2(cc.visibleRect.width / 2, cc.visibleRect.height / 2));
            dlg.addChild(shotNode);
            if (this.p_togRealTimeRendering.isChecked) {
                this._renderList.push(shotNode);
            } else {
                // 把 BlurNormal.effect blurRadius 的值改的特别大， 执不执行下面这一行代码 FPS的差距就体现出来了
                ScreenPostProcessing.reRenderNode(shotNode);
            }
        }, this);

        this.p_sliderModifyParam.node.on('slide', (event) => {
            let val: number = this.p_sliderModifyParam.progress * 8 - 4;
            ScreenPostProcessing.instance.p_mtlPencilSketch.setProperty('uIntensity', val);
        }, this);

        this.p_tgSelectEffect.toggleItems.forEach((ele, index) => {
            ele.node.on('toggle', () => {
                ScreenPostProcessing.setEffectType(index);
                this._refreshUIVisible();
            }, this);
        });
    }

    private _refreshUIVisible(): void {
        this.p_sliderModifyParam.node.active = ScreenPostProcessing.getEffectType() === EffectType.PencilSketch;
    }

    protected update(dt: number): void {
        this._renderList.forEach(ele => {
            let texture = ScreenPostProcessing.getRenderTexture({
                renderNode: cc.Canvas.instance.node,
                frameSize: cc.size(cc.visibleRect.width + 10, cc.visibleRect.height + 10)
            });

            ele.getComponent(cc.Sprite).spriteFrame.setTexture(texture);
            ele.getComponent(cc.Sprite)._updateMaterial();
        });
    }
}
export = Main;