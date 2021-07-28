/**
 * @author xshu
 * @version 0.0.1
 * @description ...
 */

import ScreenPostProcessing = require("./ScreenPostProcessing");

const {ccclass, property} = cc._decorator;
// const BasePage = require('basePage');

// interface IParam {}

@ccclass
class Main extends cc.Component {

    @property(cc.Button)
    public p_btnShowPage: cc.Button = null;

    protected onLoad (): void {
        this.p_btnShowPage.node.on('click', () => {
            const recycleImg = ScreenPostProcessing.getRecycleShotTexture();
            const shotNode = ScreenPostProcessing.getScreenShotNode(cc.Canvas.instance.node, recycleImg);

            const dlg = new cc.Node('Dialog');
            shotNode.on(cc.Node.EventType.TOUCH_END, () => {
                dlg.destroy();
            }, this);
            cc.Canvas.instance.node.addChild(dlg);
            dlg.setPosition(cc.Vec2.ZERO);
            dlg.addChild(shotNode);
            // 把 BlurNormal.effect blurRadius 的值改的特别大， 执不执行下面这一行代码 FPS的差距就体现出来了
            ScreenPostProcessing.reRenderNode(shotNode);
        }, this);
    }
}
export = Main;