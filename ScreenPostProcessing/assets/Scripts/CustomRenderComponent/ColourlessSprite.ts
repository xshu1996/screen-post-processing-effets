/**
 * @description 无颜色、且传递texture size 和 合图后的 uv range Sprite 类
 * @author xshu
 * @see https://github.com/xshu1996
 */

import { ColourlessAssembler } from "../custom_assembler/base_assembler/ColourlessAssembler";
import { ColourlessAssemblerSimple } from "../custom_assembler/base_assembler/ColourlessAssemblerSimple";

const { ccclass, menu, inspector } = cc._decorator;

@ccclass
@menu("CustomUI/Assembler/ColourlessSprite")
@inspector("packages://inspector/inspectors/comps/sprite.js")
export default class ColourlessSprite extends cc.Sprite
{
    protected resetInEditor(): void
    {
        cc.resources.load("common/materials/colourless.mtl", (err, mat: cc.Material) =>
        {
            if (!err && mat) 
            {
                this.setMaterial(0, mat);
            }
        });
    }

    public _flushAssembler(): void
    {
        // @ts-ignore
        let assembler: ColourlessAssemblerSimple = this._assembler;
        if (!assembler)
        {
            return;
        }
        // @ts-ignore
        this.setVertsDirty();
    }

    public _resetAssembler(): void
    {
        // @ts-ignore
        let assembler = this._assembler = new ColourlessAssemblerSimple();
        this._flushAssembler();

        assembler.init(this);
    }
}

cc.Assembler.register(ColourlessSprite, {
    getConstructor(sprite: cc.Sprite)
    {
        let ctor = ColourlessAssembler;

        if (sprite.type === cc.Sprite.Type.SLICED)
        {
            ctor = ColourlessAssemblerSimple;
        }
        // 扩展其他几种 TODO: xshu
        return ctor;
    }
});