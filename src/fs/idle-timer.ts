
export type IdleTimer={
    activate():void,
    isActive:boolean,
};
export function idleTimer({
    min=10, max=1000, rate=2,
    handler,
}:{
    min?:number, max?:number, rate?:number,
    handler: ()=>void,
}):IdleTimer {
    let state=null as null|{
        start: number,
        min: number, max:number, 
    };
    let h=null as null|NodeJS.Timeout;
    let theHandler=()=>{
        state=null;
        h=null;
        handler();        
    };
    let lastAt=null as null|number;
    return {
        get isActive(){
            return !!state;
        },
        activate(){
            if (state) {
                const elapsed=performance.now()-state.start;
                let at=state.start+elapsed*rate;
                if(at>state.max) at=state.max; 
                if(at<state.min) at=state.min; 
                setTimeoutAt(at,);
            } else {
                const now=performance.now();
                state={
                    start: now,
                    min: now+min, max: now+max,
                };
                setTimeoutAt(state.min,);
            }
        }
    };
    function setTimeoutAt(at:number, ) {
        let delay=at-performance.now();
        if (delay<0) delay=0;
        if (h!=null && lastAt!=null && at<=lastAt) return;
        lastAt=at;
        if (h!=null) clearTimeout(h);
        h=setTimeout(theHandler, delay);
        return h;
    } 
}
