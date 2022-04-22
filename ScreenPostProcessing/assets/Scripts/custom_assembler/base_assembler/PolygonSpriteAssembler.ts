import { MathUtils } from "../../Utils/MathUtils";
import CustomSpriteAssembler2D from "./CustomSpriteAssembler2D";

// 自定义顶点格式，在vfmtPosUvColor基础上，加入gfx.ATTR_UV1，去掉gfx.ATTR_COLOR
let gfx = cc["gfx"];
var vfmtCustom = new gfx.VertexFormat([
    { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
    { name: gfx.ATTR_UV0, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },        // texture纹理uv
    { name: gfx.ATTR_COLOR, type: gfx.ATTR_TYPE_UINT8, num: 4, normalize: true }
]);

export default class PolygonSpriteAssembler extends CustomSpriteAssembler2D
{
    // 根据自定义顶点格式，调整下述常量
    verticesCount: number = 4;
    indicesCount: number = 6;
    uvOffset: number = 2;
    colorOffset: number = 4;
    floatsPerVert: number = 5;

    // ------------------- Custom Field ---------------- //
    indicesArr: number[] = [];

    initData()
    {
        let data = this._renderData;
        // createFlexData支持创建指定格式的renderData
        data.createFlexData(0, this.verticesCount, this.indicesCount, this.getVfmt());
        // data.createQuadData(0, this.verticesFloats, this.indicesCount);

        // createFlexData不会填充顶点索引信息，手动补充一下
        let indices = data.iDatas[0];
        data.initQuadIndices(indices);
        // let count = indices.length / 6;
        // for (let i = 0, idx = 0; i < count; i++)
        // {
        //     let vertextID = i * 4;
        //     indices[idx++] = vertextID;
        //     indices[idx++] = vertextID + 1;
        //     indices[idx++] = vertextID + 2;
        //     indices[idx++] = vertextID + 1;
        //     indices[idx++] = vertextID + 3;
        //     indices[idx++] = vertextID + 2;
        // }
    }

    /** 更新renderdata */
    protected updateRenderData(comp)
    {
        if (comp._vertsDirty)
        {
            this.resetData(comp);
            this.updateUVs(comp);
            this.updateVerts(comp);
            this.updateColor(comp, null);
            comp._vertsDirty = false;
        }
    }

    // 自定义格式以getVfmt()方式提供出去，除了当前assembler，render-flow的其他地方也会用到
    getVfmt()
    {
        return vfmtCustom;
    }

    // 重载getBuffer(), 返回一个能容纳自定义顶点数据的buffer
    // 默认fillBuffers()方法中会调用到
    getBuffer()
    {
        // @ts-ignore
        return cc.renderer._handle.getBuffer("mesh", this.getVfmt());
    }

    // pos数据有变化
    updateVerts(sprite)
    {
        this.indicesArr = MathUtils.splitPolygon2Triangle(sprite.polygon);
        this.updateWorldVerts(sprite);
    }

    // 如果 effect 不使用节点颜色可以放开注释不写逻辑覆盖父类此方法
    // updateColor(sprite)
    // {
    //     // 由于已经去掉了color字段，这里重载原方法，并且不做任何事
    // }


    updateUVs(sprite)
    {
        const uvOffset = this.uvOffset;
        const floatsPerVert = this.floatsPerVert;
        const verts = this._renderData.vDatas[0];
        // @ts-ignore
        let o_uv = sprite._spriteFrame.uv;
        let uvs = [];
        const l = o_uv[0], b = o_uv[1], t = o_uv[7], r = o_uv[6];
        cc.log(l, r, b, t);
        uvs = MathUtils.calculateUVs(sprite.polygon, sprite._spriteFrame._rect.width, sprite._spriteFrame._rect.height, [l, b, r, t]);
        cc.log(uvs);
        let polygon = sprite.polygon;
        for (let i = 0; i < polygon.length; i++)
        {
            let dstOffset = floatsPerVert * i + uvOffset;
            verts[dstOffset] = uvs[i].x;
            verts[dstOffset + 1] = uvs[i].y;
        }
    }

    updateWorldVertsWebGL(comp)
    {
        let local = this._local;
        let verts = this._renderData.vDatas[0];

        let matrix = comp.node._worldMatrix;
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
        let floatsPerVert = this.floatsPerVert;

        const polygon = comp.polygon;

        if (justTranslate)
        {
            for (let i = 0; i < polygon.length; ++i)
            {
                verts[i * floatsPerVert] = polygon[i].x + tx;
                verts[i * floatsPerVert + 1] = polygon[i].y + ty;
            }
        }
        else
        {
            for (let i = 0; i < polygon.length; ++i)
            {
                verts[i * floatsPerVert] = a * polygon[i].x + c * polygon[i].y + tx;
                verts[i * floatsPerVert + 1] = b * polygon[i].x + d * polygon[i].y + ty;
            }
        }
    }

    //每帧都会被调用
    fillBuffers(comp, renderer)
    {
        if (renderer.worldMatDirty)
        {
            this.updateWorldVerts(comp);
        }

        let renderData = this._renderData;

        // vData里包含 pos, uv, color数据, iData中包含三角形顶点索引
        let vData = renderData.vDatas[0];
        let iData = renderData.iDatas[0];

        let buffer = this.getBuffer();
        let offsetInfo = buffer.request(this.verticesCount, this.indicesCount);

        // buffer data may be realloc, need get reference after request.

        // fill vertices
        let vertexOffset = offsetInfo.byteOffset >> 2,
            vbuf = buffer._vData;
        if (vData.length + vertexOffset > vbuf.length)
        {
            vbuf.set(vData.subarray(0, vbuf.length - vertexOffset), vertexOffset);
        } 
        else
        {
            vbuf.set(vData, vertexOffset);
        }

        // fill indices
        let ibuf = buffer._iData,
            indiceOffset = offsetInfo.indiceOffset,
            vertexId = offsetInfo.vertexOffset;             // vertexId是已经在buffer里的顶点数,也是当前顶点序号的基数

        let ins = this.indicesArr;
        for (let i = 0; i < iData.length; i++)
        {
            ibuf[indiceOffset++] = vertexId + ins[i];
        }
    }

    public resetData(comp)
    {
        let points = comp.polygon;
        if (!points || points.length < 3) return;
        // 三角形数量 = 顶点数 - 2
        // 索引数量 = 三角形数量 * 3
        this.verticesCount = points.length;
        this.indicesCount = (this.verticesCount - 2) * 3;
        this._renderData.clear();
        this.initData();
    }
}