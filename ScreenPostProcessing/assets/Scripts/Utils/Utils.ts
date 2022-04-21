export class MathUtils 
{
    /** 耳切法，将多边形分解为多个三角形，获取切除凹顶点后的顶点 */
    public static splitPolygon2Triangle(points: cc.Vec2[]): number[]
    {
        if (points.length <= 3) return [0, 1, 2];
        // point与idx的映射
        let pointMap: { [key: string]: number } = {};
        for (let i = 0; i < points.length; ++i)
        {
            let p = points[i];
            pointMap[`${p.x}-${p.y}`] = i;
        }
        const getIdx = (p: cc.Vec2) =>
        {
            return pointMap[`${p.x}-${p.y}`];
        }
        points = points.concat([]);
        let idxs: number[] = [];

        let index = 0;
        while (points.length > 3)
        {
            let p1 = points[(index) % points.length]
                , p2 = points[(index + 1) % points.length]
                , p3 = points[(index + 2) % points.length];
            let splitPoint = (index + 1) % points.length;

            let v1 = p2.sub(p1);
            let v2 = p3.sub(p2);
            if (v1.cross(v2) < 0)
            {
                // 是一个凹角, 寻找下一个
                index = (index + 1) % points.length;
                continue;
            }
            let hasPoint = false;
            for (const p of points)
            {
                if (p != p1 && p != p2 && p != p3 && this.isInTriangle(p, p1, p2, p3))
                {
                    hasPoint = true;
                    break;
                }
            }
            if (hasPoint)
            {
                // 当前三角形包含其他点, 寻找下一个
                index = (index + 1) % points.length;
                continue;
            }
            // 找到了耳朵, 切掉
            idxs.push(getIdx(p1), getIdx(p2), getIdx(p3));
            points.splice(splitPoint, 1);
        }
        for (const p of points)
        {
            idxs.push(getIdx(p));
        }
        return idxs;
    }

    /** 判断一个点是否在三角形内 */
    public static isInTriangle(point: cc.Vec2, triA: cc.Vec2, triB: cc.Vec2, triC: cc.Vec2): boolean
    {
        let AB = triB.sub(triA), AC = triC.sub(triA),
            BC = triC.sub(triB), AD = point.sub(triA),
            BD = point.sub(triB);
        // @ts-ignore
        return (AB.cross(AC) >= 0 ^ AB.cross(AD) < 0) && (AB.cross(AC) >= 0 ^ AC.cross(AD) >= 0) && (BC.cross(AB) > 0 ^ BC.cross(BD) >= 0);
    }

    /** 计算uv, 锚点都是中心 */
    public static calculateUVs(points: cc.Vec2[], width: number, height: number, o_uv: number[] = [0, 1, 1, 0]): cc.Vec2[]
    {
        // 用于合图映射到真实的uv
        let [l, b, r, t] = o_uv;
        let uvs: cc.Vec2[] = [];
        for (const p of points)
        {
            let x = cc.misc.clamp01((p.x + width / 2) / width) * (r - l) + l;
            let y = cc.misc.clamp01(1.0 - (p.y + height / 2) / height) * (b - t) + t;
            uvs.push(cc.v2(x, y));
        }
        return uvs;
    }
}