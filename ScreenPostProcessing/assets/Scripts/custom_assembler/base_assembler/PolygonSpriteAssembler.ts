import PolygonSprite from "../../PolygonSprite";
import CustomSpriteAssembler2D from "./CustomSpriteAssembler2D";

// 自定义顶点格式，在vfmtPosUvColor基础上，加入gfx.ATTR_UV1，去掉gfx.ATTR_COLOR
let gfx = cc["gfx"];
var vfmtCustom = new gfx.VertexFormat([
    { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
    { name: gfx.ATTR_UV0, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },        // texture纹理uv
    { name: gfx.ATTR_COLOR, type: gfx.ATTR_TYPE_UINT8, num: 4, normalize: true }
]);

const VEC2_ZERO = cc.Vec2.ZERO;

export default class PolygonSpriteAssembler extends CustomSpriteAssembler2D
{
    // 根据自定义顶点格式，调整下述常量
    verticesCount: number = 4;
    indicesCount: number = 6;
    uvOffset: number = 2;
    colorOffset: number = 4;
    floatsPerVert: number = 5;

    // ------------------- Custom Field ---------------- //
    // 自定义数据，将被写入uv1的位置
    // public moveSpeed: cc.Vec2 = VEC2_ZERO;

    public vertCustom: cc.Vec2[] = new Array(4);

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

    // pos数据没有变化，不用重载
    // updateVerts(sprite) {
    // }

    // 如果 effect 不使用节点颜色可以放开注释不写逻辑覆盖父类此方法
    // updateColor(sprite)
    // {
    //     // 由于已经去掉了color字段，这里重载原方法，并且不做任何事
    // }


    updateUVs(sprite: PolygonSprite)
    {
        super.updateUVs(sprite);
        // super
        let uv = sprite._spriteFrame.uv;
        let uvOffset = this.uvOffset;
        let floatsPerVert = this.floatsPerVert;
        let verts = this._renderData.vDatas[0];

        const l = uv[0], b = uv[1], t = uv[7], r = uv[6];
        for (let i = 0; i < sprite.uvs.length; i++)
        {
            let srcOffset = i * 2;
            let dstOffset = floatsPerVert * i + uvOffset;
            // verts[dstOffset] = uv[srcOffset];
            // verts[dstOffset + 1] = uv[srcOffset + 1];
            const uvs = sprite.uvs[i];
            this._renderData.vDatas[0][dstOffset] = l + (r - l) * uvs.x
            this._renderData.vDatas[0][dstOffset + 1] = b + (t - b) * uvs.y
        }

        // let dstOffset;

        // let l = uv[0],
        //     r = uv[2],
        //     t = uv[5],
        //     b = uv[1];
        // const renderData = sprite.renderData!;
        // //实际uv
        // // @ts-ignore
        // const uv = sprite.spriteFrame.uv;
        // // 左 下 上 右 
        // const l = uv[0], b = uv[1], t = uv[7], r = uv[6]
        // for (let i = 0; i < sprite.uvs.length; ++i)
        // {
        //     const uvs = sprite.uvs[i];
        //     renderData.data[i].u = l + (r - l) * uvs.x
        //     renderData.data[i].v = b + (t - b) * uvs.y
        // }
        // renderData.uvDirty = false;
    }

    updateVerts(sprite)
    {
        let node = sprite.node,
            cw = node.width, ch = node.height,
            appx = node.anchorX * cw, appy = node.anchorY * ch,
            l, b, r, t;
        if (sprite.trim)
        {
            l = -appx;
            b = -appy;
            r = cw - appx;
            t = ch - appy;
        }
        else
        {
            let frame = sprite.spriteFrame,
                ow = frame._originalSize.width, oh = frame._originalSize.height,
                rw = frame._rect.width, rh = frame._rect.height,
                offset = frame._offset,
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
        this.updateWorldVertsWebGL(sprite);
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
        } else
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

    // 保存顶点数据
    updateVertexData(sprite: PolygonSprite)
    {
        //中间变量
        const renderData = sprite.renderData;
        if (!renderData)
        {
            return;
        }
        renderData.vertexCount = renderData.dataLength = sprite.vertices.length;
        // 三角形数量 = 顶点数 - 2
        // 索引数量 = 三角形数量X3
        renderData.indicesCount = (renderData.vertexCount - 2) * 3
        renderData.vertDirty = false;
        for (let i = 0; i < sprite.vertices.length; ++i)
        {
            const xy = sprite.vertices[i];
            renderData.data[i].x = xy.x
            renderData.data[i].y = xy.y
        }
    }

    // fillBuffers(sprite: PolygonSprite, renderer: any)
    // {
    //     if (renderer.worldMatDirty)
    //     {
    //         this.updateWorldVerts(sprite);
    //     }

    //     let renderData = this._renderData;
    //     let vData = renderData.vDatas[0];
    //     let iData = renderData.iDatas[0];

    //     let buffer = this.getBuffer();
    //     let offsetInfo = buffer.request(this.verticesCount, this.indicesCount);
    //     let vertexOffset = offsetInfo.byteOffset >> 2,
    //         vBuf = buffer._vData;

    //     // 填充顶点
    //     for (let i = 0; i < renderData.vertexCount; ++i)
    //     {
    //         const vert = renderData.data[i];
    //         // 计算世界坐标
    //         vBuf![vertexOffset++] = a * vert.x + c * vert.y + tx;
    //         vBuf![vertexOffset++] = b * vert.x + d * vert.y + ty;
    //         vBuf![vertexOffset++] = vert.z;
    //         // 填充uv
    //         vBuf![vertexOffset++] = vert.u;
    //         vBuf![vertexOffset++] = vert.v;
    //         cc.Color.toArray(vBuf!, sprite.color, vertexOffset);
    //         vertexOffset += 4;
    //     }

    //      // fill indices
    //     let iBuf = buffer._iData,
    //         indicesOffset = offsetInfo.indiceOffset,
    //         vertexId = offsetInfo.vertexOffset;
    //     for (let i = 0; i < sprite.vertices.length - 2; ++i)
    //     {
    //         const start = i;
    //         iBuf![indicesOffset++] = vertexId;
    //         iBuf![indicesOffset++] = start + 1 + vertexId;
    //         iBuf![indicesOffset++] = start + 2 + vertexId;
    //     }
    // }
}