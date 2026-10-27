import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
// One resident mesh. Scroll changes camera/model transforms only: no decoding,
// video seeking, pointer capture, scroll writes, or frame-cache substitutions.
export async function createHoodieScene(canvas){
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,40),pivot=new THREE.Group();scene.add(pivot);
 scene.add(new THREE.HemisphereLight(0xffffff,0x6b655c,2.4));
 const key=new THREE.DirectionalLight(0xfff8ee,3.3);key.position.set(-3,4,5);scene.add(key);
 const edge=new THREE.DirectionalLight(0xe4eaff,3.6);edge.position.set(3,2,-3);scene.add(edge);
 const fill=new THREE.DirectionalLight(0xffffff,1.2);fill.position.set(3,0,4);scene.add(fill);
 const gltf=await new GLTFLoader().loadAsync('/assets/shop/hoodie.glb?v=3d-1');
 const model=gltf.scene;const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
 model.position.sub(center);const wrapper=new THREE.Group();wrapper.add(model);wrapper.rotation.y=-Math.PI/2;wrapper.scale.setScalar(2.5/size.y);pivot.add(wrapper);
 model.traverse(o=>{if(o.isMesh){o.frustumCulled=false;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(m.map)m.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());m.envMapIntensity=.35;}}});
 let width=0,height=0;
 const smooth=(a,b,x)=>{const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
 function resize(w,h){if(w===width&&h===height)return;width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
 function draw(progress){const mobile=width<701,turn=smooth(.12,.76,progress),exit=smooth(.82,1,progress);pivot.rotation.y=turn*Math.PI; pivot.rotation.x=-.035*Math.sin(turn*Math.PI);pivot.scale.setScalar(mobile?.84:1);pivot.position.set(mobile?0:.40,(mobile?-.24:.04)+exit*.12,0);const distance=mobile?7.4:6.1;camera.position.set(0,.06,distance-.5*Math.sin(turn*Math.PI)+exit*.55);camera.lookAt(0,0,0);renderer.render(scene,camera);canvas.dataset.progress=progress.toFixed(5);canvas.dataset.rotation=pivot.rotation.y.toFixed(5)}
 return {resize,draw,dispose(){renderer.dispose();model.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){m.map?.dispose();m.dispose()}}})}};
}
