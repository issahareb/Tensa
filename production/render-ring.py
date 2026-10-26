import sys
import bpy, numpy as np, math
from mathutils import Matrix, Vector
from pathlib import Path
root=Path(sys.argv[sys.argv.index('--')+1]) if '--' in sys.argv else Path('/workspace/tripo-assets/tensa-ring-source')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(root/'model.glb'))
obj=next(o for o in bpy.context.scene.objects if o.type=='MESH')
p=np.array([tuple(obj.matrix_world@v.co) for v in obj.data.vertices]);p-=(p.max(0)+p.min(0))/2
_,basis=np.linalg.eigh(np.cov(p.T));transform=basis[:,[2,1,0]]
if np.linalg.det(transform)<0:transform[:,2]*=-1
p=p@transform;p-=(p.max(0)+p.min(0))/2;p/=np.linalg.norm(p[:,:2],axis=1).max()
obj.matrix_world=Matrix.Identity(4)
for v,co in zip(obj.data.vertices,p):v.co=co
obj.data.update()
mat=bpy.data.materials.new('TENSA | white light emission 12');mat.use_nodes=True
bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(1,1,1,1);bsdf.inputs['Roughness'].default_value=.2;bsdf.inputs['Metallic'].default_value=0
bsdf.inputs['Emission Color'].default_value=(1,1,1,1);bsdf.inputs['Emission Strength'].default_value=12
obj.data.materials.clear();obj.data.materials.append(mat)
for face in obj.data.polygons:face.material_index=0;face.use_smooth=True
bpy.ops.export_scene.gltf(filepath=str(root/'tensa-ring-luminous-high.glb'),export_format='GLB',use_selection=False)
obj.rotation_euler[1]=math.radians(-18)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=False
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(0,0,0,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=0
bpy.ops.object.camera_add(location=(0,0,4.6));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,0))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=65;scene.camera=camera
scene.render.resolution_x=1100;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.view_settings.exposure=0
scene.use_nodes=True;tree=scene.node_tree;tree.nodes.clear();layer=tree.nodes.new('CompositorNodeRLayers');glare=tree.nodes.new('CompositorNodeGlare');glare.glare_type='FOG_GLOW';glare.quality='HIGH';glare.threshold=.7;glare.size=8;out=tree.nodes.new('CompositorNodeComposite');tree.links.new(layer.outputs['Image'],glare.inputs['Image']);tree.links.new(glare.outputs['Image'],out.inputs['Image'])
scene.render.filepath=str(root/'luminous-preview.png');bpy.ops.wm.save_as_mainfile(filepath=str(root/'tensa-ring-luminous.blend'));bpy.ops.render.render(write_still=True)
print('FINISHED',len(obj.data.vertices),len(obj.data.polygons))
