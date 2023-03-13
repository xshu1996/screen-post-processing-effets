import { ColourlessAssembler } from "./ColourlessAssembler";

export class ColourlessAssemblerSimple extends ColourlessAssembler
{
    protected updateRenderData(sprite: cc.Sprite)
    {
        this.packToDynamicAtlas(sprite, sprite.spriteFrame);
        super.updateRenderData(sprite);
    }

    protected updateUVs(sprite: cc.Sprite): void
    {
        let uv = sprite["_spriteFrame"].uv;
        let uvOffset = this.uvOffset;
        let floatPerVert = this.floatsPerVert;
        let vData = this._renderData.vDatas[0];

        for (let i = 0; i < 4; ++i)
        {
            let scrOffset = i * 2;
            let dstOffset = floatPerVert * i + uvOffset;
            vData[dstOffset + 0] = uv[scrOffset];
            vData[dstOffset + 1] = uv[scrOffset + 1];
        }
    }

    protected updateVerts(sprite: cc.Sprite): void
    {
        let node = sprite.node,
            cw = node.width, ch = node.height,
            appx = node.anchorX * cw, appy = node.anchorY * ch,
            l, b, r, t;
        if (sprite.trim) {
            l = -appx;
            b = -appy;
            r = cw - appx;
            t = ch - appy;
        }
        else {
            let frame = sprite.spriteFrame,
                ow = frame["_originalSize"].width, oh = frame["_originalSize"].height,
                rw = frame["_rect"].width, rh = frame["_rect"].height,
                offset = frame["_offset"],
                scaleX = cw / ow, scaleY = ch / oh;
            let trimLeft = offset.x + (ow - rw) / 2;
            let trimRight = offset.x - (ow - rw) / 2;
            let trimBottom = offset.y + (oh - rh) / 2;
            let trimTop = offset.y - (oh - rh) / 2;
            l = trimLeft * scaleX - appx;
            b = trimBottom * scaleY - appy;
            r = cw + trimRight * scaleX - appx;
            t = ch + trimTop * scaleY - appy;
        }

        let local = this._local;
        local[0] = l;
        local[1] = b;
        local[2] = r;
        local[3] = t;
        this.updateWorldVerts(sprite);
    }
}