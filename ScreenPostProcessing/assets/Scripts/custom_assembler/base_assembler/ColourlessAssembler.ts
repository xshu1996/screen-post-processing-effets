const gfx = cc["gfx"];
const vmftPosUvTextSizeUvRange = new gfx.VertexFormat([
    { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
    { name: gfx.ATTR_UV0, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
    { name: "a_textSize", type: gfx.ATTR_TYPE_FLOAT32, num: 2 }, // texture width/height
    { name: "a_uvRange", type: gfx.ATTR_TYPE_FLOAT32, num: 4 } // xMin, yMin, xMax, yMax
]);

export class ColourlessAssembler extends cc.Assembler
{
    /** 顶点数量 */
    protected verticesCount: number = 4;
    /** 顶点索引数量 */
    protected indicesCount: number = 6;
    protected floatsPerVert: number = 10;
    /** uv偏移量 */
    protected uvOffset: number = 2;
    protected textSizeOffset: number = 4;
    protected uvRangeOffset: number = 6;

    protected _renderData: cc.RenderData | null = null;
    /** 中间结果 [l,b,r,t] node对象左下、右上顶点的本地坐标，即相对于锚点的偏移 */
    protected _local: any[] = [];

    constructor()
    {
        super();

        this._renderData = new cc.RenderData();
        this._renderData.init(this);

        this.initData();
        this.initLocal();
    }

    public get verticesFloats(): number
    {
        return this.verticesCount * this.floatsPerVert;
    }

    protected initData(): void
    {
        let data = this._renderData;
        data.createFlexData(0, this.verticesCount, this.indicesCount, this.getVfmt());

        let indices = data.iDatas[0];
        let count: number = indices.length / 6;

        for (let i = 0, idx = 0; i < count; ++i)
        {
            let vertexID: number = i * 4;
            indices[idx++] = vertexID;
            indices[idx++] = vertexID + 1;
            indices[idx++] = vertexID + 2;
            indices[idx++] = vertexID + 1;
            indices[idx++] = vertexID + 3;
            indices[idx++] = vertexID + 2;
        }
    }

    protected initLocal(): void
    {
        this._local = [];
        this._local.length = 4;
    }

    public getBuffer(renderer?: any): any
    {
        return cc.renderer._handle.getBuffer("mesh", this.getVfmt());
    }

    public getVfmt(): any
    {
        return vmftPosUvTextSizeUvRange;
    }

    public updateColor(): void
    {
        // do nothing
    }

    protected updateUvRangeInfo(sprite: cc.Sprite): void
    {
        let vData = this._renderData.vDatas[0];
        let uv: number[] = sprite.spriteFrame["uv"];

        for (let i = 0; i < this.verticesCount; ++i)
        {
            let dstOffset: number = this.floatsPerVert * i + this.uvRangeOffset;

            vData[dstOffset + 0] = uv[0]; // xMin
            vData[dstOffset + 1] = uv[7]; // yMin
            vData[dstOffset + 2] = uv[6]; // xMax
            vData[dstOffset + 3] = uv[1]; // yMax
        }
    }

    protected upDateTextureInfo(sprite: cc.Sprite): void
    {
        let vData = this._renderData.vDatas[0];
        let originalSize: cc.Size = sprite.spriteFrame["_rect"];

        for (let i = 0; i < this.verticesCount; ++i)
        {
            let dstOffset: number = this.floatsPerVert * i + this.textSizeOffset;
            vData[dstOffset + 0] = originalSize.width;
            vData[dstOffset + 1] = originalSize.height;
        }
    }

    public updateWorldVerts(comp: cc.RenderComponent): void
    {
        if (CC_NATIVERENDERER)
        {
            this.updateWorldVertsNative(comp);
        } else
        {
            this.updateWorldVertsWebGL(comp);
        }
    }

    public updateWorldVertsWebGL(comp: cc.RenderComponent): void
    {
        let local = this._local;
        let verts = this._renderData.vDatas[0];

        let matrix = comp.node["_worldMatrix"];
        let matrixm = matrix.m,
            a = matrixm[0], b = matrixm[1], c = matrixm[4], d = matrixm[5],
            tx = matrixm[12], ty = matrixm[13];

        let vl = local[0], vr = local[2],
            vb = local[1], vt = local[3];

        /*
        m00 = 1, m01 = 0, m02 = 0, m03 = 0,
        m04 = 0, m05 = 1, m06 = 0, m07 = 0,
        m08 = 0, m09 = 0, m10 = 1, m11 = 0,
        m12 = 0, m13 = 0, m14 = 0, m15 = 1
        */
        // [a,b,c,d] = _worldMatrix[1,2,4,5] == [1,0,0,1]
        // _worldMatrix[12,13]是xy的平移量
        // 即世界矩阵的左上角2x2是单元矩阵，说明在2D场景内没有出现旋转或者缩放
        let justTranslate = a === 1 && b === 0 && c === 0 && d === 1;

        // render data = verts = x|y|u|v|color|x|y|u|v|color|...
        // 填充render data中4个顶点的xy部分
        let index = 0;
        let floatsPerVert = this.floatsPerVert;
        if (justTranslate)
        {
            // 左下角为起点 逆时针顺序
            // left bottom
            verts[index] = vl + tx;
            verts[index + 1] = vb + ty;
            index += floatsPerVert;
            // right bottom
            verts[index] = vr + tx;
            verts[index + 1] = vb + ty;
            index += floatsPerVert;
            // left top
            verts[index] = vl + tx;
            verts[index + 1] = vt + ty;
            index += floatsPerVert;
            // right top
            verts[index] = vr + tx;
            verts[index + 1] = vt + ty;
        }
        else
        {
            // 4对xy分别乘以 [2,2]仿射矩阵，然后+平移量
            let al = a * vl, ar = a * vr,
                bl = b * vl, br = b * vr,
                cb = c * vb, ct = c * vt,
                db = d * vb, dt = d * vt;

            // left bottom
            // newx = vl * a + vb * c + tx
            // newy = vl * b + vb * d + ty
            verts[index] = al + cb + tx;
            verts[index + 1] = bl + db + ty;
            index += floatsPerVert;
            // right bottom
            verts[index] = ar + cb + tx;
            verts[index + 1] = br + db + ty;
            index += floatsPerVert;
            // left top
            verts[index] = al + ct + tx;
            verts[index + 1] = bl + dt + ty;
            index += floatsPerVert;
            // right top
            verts[index] = ar + ct + tx;
            verts[index + 1] = br + dt + ty;
        }
    }

    // native场景下使用的updateWorldVerts
    // copy from \jsb-adapter-master\engine\assemblers\assembler-2d.js
    public updateWorldVertsNative(comp: cc.RenderComponent): void
    {
        let local = this._local;
        let verts = this._renderData.vDatas[0];
        let floatsPerVert = this.floatsPerVert;

        let vl = local[0],
            vr = local[2],
            vb = local[1],
            vt = local[3];

        let index: number = 0;
        // left bottom
        verts[index] = vl;
        verts[index + 1] = vb;
        index += floatsPerVert;
        // right bottom
        verts[index] = vr;
        verts[index + 1] = vb;
        index += floatsPerVert;
        // left top
        verts[index] = vl;
        verts[index + 1] = vt;
        index += floatsPerVert;
        // right top
        verts[index] = vr;
        verts[index + 1] = vt;
    }

    public fillBuffers(comp: cc.RenderComponent, renderer: any): void
    {
        if (renderer.worldMatDirty)
        {
            this.updateWorldVerts(comp);
        }

        let renderData: cc.RenderData = this._renderData;
        let vData: Float32Array = renderData.vDatas[0];
        let iData: Float32Array = renderData.iDatas[0];

        let buffer = this.getBuffer(renderer);
        let offsetInfo = buffer.request(this.verticesCount, this.indicesCount);

        // fill vertices
        let vertexOffset: number = offsetInfo.byteOffset >> 2;
        let vBuf: Float32Array = buffer._vData;

        if (vData.length + vertexOffset > vBuf.length)
        {
            vBuf.set(vData.subarray(0, vBuf.length - vertexOffset), vertexOffset);
        }
        else
        {
            vBuf.set(vData, vertexOffset);
        }

        // fill indices
        let iBuf: Float32Array = buffer._iData;
        let indiceOffset = offsetInfo.indiceOffset;
        let vertexId: number = offsetInfo.vertexOffset;

        for (let i = 0, l = iData.length; i < l; i++)
        {
            iBuf[indiceOffset++] = vertexId + iData[i];
        }
    }

    public packToDynamicAtlas(comp: cc.RenderComponent, frame: any): void
    {
        if (CC_TEST) return;

        if (!frame._original && cc.dynamicAtlasManager && frame._texture.packable)
        {
            let packedFrame: any = cc.dynamicAtlasManager.insertSpriteFrame(frame);
            if (packedFrame)
            {
                frame._setDynamicAtlasFrame(packedFrame);
            }
        }
        let material = comp["_materials"][0];
        if (!material) return;

        if (material.getProperty("texture") !== frame._texture._texture)
        {
            // texture was packed to dynamic atlas, should update uvs
            comp["_vertsDirty"] = true;
            comp["_updateMaterial"]();
        }
    }

    protected updateRenderData(comp: cc.Sprite): void
    {
        if (comp["_vertsDirty"])
        {
            this.updateUVs(comp);
            this.updateVerts(comp);
            this.upDateTextureInfo(comp);
            this.updateUvRangeInfo(comp);
            comp["_vertsDirty"] = false;
        }
    }

    protected updateUVs(comp: cc.RenderComponent): void
    {
        // 4个顶点的uv坐标，对应左下、右下、左上、右上
        // 如果是cc.Sprite组件，这里取sprite._spriteFrame.uv;
        let uv = [0, 0, 1, 0, 0, 1, 1, 1];
        let uvOffset = this.uvOffset;
        let floatsPerVert = this.floatsPerVert;
        let verts = this._renderData.vDatas[0];

        // render data = verts = x|y|u|v|x|y|u|v|...
        // 填充render data中4个顶点的uv部分
        for (let i = 0; i < 4; i++)
        {
            let srcOffset = i * 2;
            let dstOffset = floatsPerVert * i + uvOffset;
            verts[dstOffset] = uv[srcOffset];
            verts[dstOffset + 1] = uv[srcOffset + 1];
        }
    }

    protected updateVerts(comp: cc.RenderComponent): void
    {
        let node: cc.Node = comp.node;
        let cw: number = node.width;
        let ch: number = node.height;
        let appx: number = node.anchorX * cw;
        let appy: number = node.anchorY * ch;
        let l: number;
        let b: number;
        let r: number;
        let t: number;

        l = - appx;
        b = - appy;
        r = cw - appx;
        t = ch - appy;

        let local = this._local;
        local[0] = l;
        local[1] = b;
        local[2] = r;
        local[3] = t;
        this.updateWorldVerts(comp);
    }
}