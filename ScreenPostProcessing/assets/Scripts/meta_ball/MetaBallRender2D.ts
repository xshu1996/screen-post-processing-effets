import { ShaderUtils } from "../Utils/ShaderUtils";
import MetaBall2D from "./MetaBall2D";

const { ccclass, property } = cc._decorator;

@ccclass
export default class MetaBallRender2D extends cc.Component
{

    protected onLoad(): void
    {
        cc.director.getPhysicsManager().enabled = true;
        // cc.director.getPhysicsManager().debugDrawFlags = cc.PhysicsManager.DrawBits.e_aabbBit |
        //     cc.PhysicsManager.DrawBits.e_jointBit |
        //     cc.PhysicsManager.DrawBits.e_shapeBit
        //     ;
        let tex = ShaderUtils.genSingleTexture();
        this.getComponent(cc.Sprite).spriteFrame = new cc.SpriteFrame(tex);
        this.getComponent(cc.Sprite).getMaterial(0).setProperty("_Size", new Float32Array([this.node.width, this.node.height]));
    }

    update(dt)
    {
        let mbData = MetaBall2D.metaballs.map(mb =>
        {
            return [mb.node.x, mb.node.y, mb.getRadius(), 1];
        });

        let data = new Float32Array(400).fill(0);
        for (let i = 0; i < data.length; i += 4)
        {
            if (i < mbData.length * 4)
            {
                let row = i / 4 | 0;
                let col = i % 4;
                data[i] = mbData[row][col];
                data[i + 1] = mbData[row][col + 1];
                data[i + 2] = mbData[row][col + 2];
                data[i + 3] = mbData[row][col + 3];
            }
        }
        this.getComponent(cc.Sprite).getMaterial(0).setProperty("_MetaballData", data);
    }
}
