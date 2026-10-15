import * as ort from 'onnxruntime-web/wasm';
let session:ort.InferenceSession|undefined;
self.onmessage=async (event:MessageEvent<{rgb:Uint8ClampedArray;base:string}>)=>{
 try{const start=performance.now();const {rgb,base}=event.data;ort.env.wasm.numThreads=1;ort.env.wasm.wasmPaths=`${base}vendor/`;if(!session){self.postMessage({progress:'U²-NetPを読み込み中（約4.6 MB）…'});session=await ort.InferenceSession.create(`${base}models/u2netp.onnx`,{executionProviders:['wasm'],graphOptimizationLevel:'all'});}
 self.postMessage({progress:'実際のAI推論を実行中。端末によって少し時間がかかります…'});
 const n=320*320,data=new Float32Array(n*3),mean=[.485,.456,.406],std=[.229,.224,.225];let max=0;for(let i=0;i<n;i++)for(let c=0;c<3;c++)max=Math.max(max,rgb[i*4+c]);max=Math.max(max,1e-6);for(let i=0;i<n;i++)for(let c=0;c<3;c++)data[c*n+i]=(rgb[i*4+c]/max-mean[c])/std[c];
 const result=await session.run({[session.inputNames[0]]:new ort.Tensor('float32',data,[1,3,320,320])});const output=result[session.outputNames[0]].data as Float32Array;let lo=Infinity,hi=-Infinity;for(let i=0;i<n;i++){lo=Math.min(lo,output[i]);hi=Math.max(hi,output[i]);}if(!Number.isFinite(lo)||!Number.isFinite(hi)||hi-lo<1e-8)throw Error('AIマスクが一様です。画像を変更してください。');const probabilities=new Float32Array(n);for(let i=0;i<n;i++)probabilities[i]=(output[i]-lo)/(hi-lo);self.postMessage({result:{probabilities,width:320,height:320,elapsedMs:performance.now()-start}},[probabilities.buffer]);
 }catch(e){self.postMessage({error:e instanceof Error?e.message:String(e)});}
};
