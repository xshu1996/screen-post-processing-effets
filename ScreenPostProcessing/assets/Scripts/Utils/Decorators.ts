export function addSoundByUrl(soundUrl: string)
{
    return (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) =>
    {
        const oldVal = descriptor.value;
        descriptor.value = function (...rest: any[])
        {
            // TODO: play sound
            oldVal.apply(this, rest);
        }
        return descriptor;
    }
}