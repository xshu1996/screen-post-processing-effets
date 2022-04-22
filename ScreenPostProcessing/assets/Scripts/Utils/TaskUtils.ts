export type ProgressHandler = (p: number) => void;
export type Runner = (task: Task, progress: ProgressHandler) => Promise<boolean>;

export class Task
{
    name: string;
    weight: number;
    runner: Runner;

    constructor(name: string, weight: number, runner: Runner)
    {
        this.name = name;
        this.weight = weight;
        this.runner = runner;
    }
}

export class TaskManager
{
    private _tasks: Task[] = [];
    private _totalWeight: number = 0;

    add(name: string, weight: number, runner: Runner): void
    {
        this._tasks.push(new Task(name, weight, runner));
        this._totalWeight += weight;
    }

    async runSerial(progress: ProgressHandler, thisObj: any): Promise<boolean>
    {
        let weight: number = 0;
        let totalTime: number = Date.now();
        progress?.call(thisObj, 0);
        for (let task of this._tasks)
        {
            cc.log(`begin task ${task.name}`);
            let dt: number = Date.now();
            let ret: boolean = await task.runner(task, (p) =>
            {
                let w = weight + task.weight * p;
                let pp = w / this._totalWeight;
                progress?.call(thisObj, pp);
                // cc.log(`task ${task.name} progress ${pp}`);
            });

            if (!ret)
            {
                return false;
            }

            weight += task.weight;
            let pp = weight / this._totalWeight;
            progress?.call(thisObj, pp);

            cc.log(`task ${task.name} done, cost ${Date.now() - dt}ms`);
        }
        cc.log(`total cost ${Date.now() - totalTime}ms`);
        return true;
    }

    async runParallel(progress: ProgressHandler, thisObj: any): Promise<any>
    {
        let weight: number = 0;
        let tasks = this._tasks.map(task =>
        {
            return new Promise(async (resolve, reject) =>
            {
                cc.log(`begin task ${task.name}`);
                let dt = Date.now();
                let ret = await task.runner(task, (p) =>
                {
                    let w = weight + task.weight * p;
                    let pp = w / this._totalWeight;
                    progress?.call(thisObj, pp);
                    // cc.log(`task ${task.name} progress ${pp}`);
                });
                weight += task.weight;
                cc.log(`task ${task.name} done, cost ${Date.now() - dt}ms`);
                let pp = weight / this._totalWeight;
                progress?.call(thisObj, pp);

                resolve(ret);
            });
        });

        let totalTime = Date.now();
        let ret = await Promise.all(tasks);
        cc.log(`total cost ${Date.now() - totalTime}ms`);

        if (ret.indexOf(false) >= 0)
        {
            return false;
        }
        return true;
    }
}