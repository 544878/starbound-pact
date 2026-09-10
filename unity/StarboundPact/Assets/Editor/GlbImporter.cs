using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using UnityEngine;
using UnityEditor.AssetImporters;

namespace Starbound.Editor {
 // Local GLB assets contain unskinned meshes and node animation. This importer deliberately
 // rejects unsupported extensions instead of silently producing incomplete character models.
 [ScriptedImporter(1,"glb")]
 public class GlbImporter : ScriptedImporter {
  JObject doc;byte[] bin;AssetImportContext ctx;
  float[] Floats(int index,int components) {
   var a=doc["accessors"][index];var v=doc["bufferViews"][(int)a["bufferView"]];
   if((int)a["componentType"]!=5126)throw new InvalidDataException("Expected float accessor");
   int count=(int)a["count"],offset=(int?)v["byteOffset"]??0;offset+=(int?)a["byteOffset"]??0;int stride=(int?)v["byteStride"]??components*4;
   var values=new float[count*components];for(int i=0;i<count;i++)for(int k=0;k<components;k++)values[i*components+k]=BitConverter.ToSingle(bin,offset+i*stride+k*4);return values;
  }
  int[] Indices(int index){var a=doc["accessors"][index];var v=doc["bufferViews"][(int)a["bufferView"]];int type=(int)a["componentType"],size=type==5125?4:type==5123?2:1;int offset=((int?)v["byteOffset"]??0)+((int?)a["byteOffset"]??0),count=(int)a["count"];var result=new int[count];for(int i=0;i<count;i++)result[i]=size==4?(int)BitConverter.ToUInt32(bin,offset+i*size):size==2?BitConverter.ToUInt16(bin,offset+i*size):bin[offset+i];for(int i=0;i+2<count;i+=3){int t=result[i];result[i]=result[i+2];result[i+2]=t;}return result;}
  Vector3 V(JToken t,Vector3 fallback,bool flip=false){return t==null?fallback:new Vector3((float)t[0],(float)t[1],(float)t[2]*(flip?-1:1));}
  public override void OnImportAsset(AssetImportContext context){ctx=context;var bytes=File.ReadAllBytes(ctx.assetPath);if(BitConverter.ToUInt32(bytes,0)!=0x46546C67)throw new InvalidDataException("Invalid GLB");int jsonLength=BitConverter.ToInt32(bytes,12);doc=JObject.Parse(System.Text.Encoding.UTF8.GetString(bytes,20,jsonLength));int binaryAt=20+jsonLength;int binaryLength=BitConverter.ToInt32(bytes,binaryAt);bin=new byte[binaryLength];Array.Copy(bytes,binaryAt+8,bin,0,binaryLength);
   if(doc["skins"]!=null)throw new InvalidDataException("Skinned GLB is not supported by this project importer");
   var mats=new List<Material>();foreach(var m in doc["materials"]??new JArray()){
    var mat=new Material(Shader.Find("Standard"));mat.name=(string)m["name"]??"Celestial";var p=m["pbrMetallicRoughness"];var col=p?["baseColorFactor"];if(col!=null)mat.color=new Color((float)col[0],(float)col[1],(float)col[2],(float)col[3]);mat.SetFloat("_Metallic",(float?)p?["metallicFactor"]??0);mat.SetFloat("_Glossiness",1-((float?)p?["roughnessFactor"]??.7f));
    var em=m["emissiveFactor"];if(em!=null){mat.EnableKeyword("_EMISSION");mat.SetColor("_EmissionColor",new Color((float)em[0],(float)em[1],(float)em[2]));}mats.Add(mat);ctx.AddObjectToAsset("material"+(mats.Count-1),mat);
   }
   var meshes=new List<List<Tuple<Mesh,int>>>();int meshId=0;foreach(var m in doc["meshes"]){var primitives=new List<Tuple<Mesh,int>>();foreach(var p in m["primitives"]){var mesh=new Mesh{name="Mesh_"+meshId,indexFormat=UnityEngine.Rendering.IndexFormat.UInt32};var a=p["attributes"];float[] pos=Floats((int)a["POSITION"],3);var vertices=new Vector3[pos.Length/3];for(int i=0;i<vertices.Length;i++)vertices[i]=new Vector3(pos[i*3],pos[i*3+1],-pos[i*3+2]);mesh.vertices=vertices;mesh.triangles=Indices((int)p["indices"]);
     if(a["NORMAL"]!=null){var n=Floats((int)a["NORMAL"],3);mesh.normals=Enumerable.Range(0,n.Length/3).Select(i=>new Vector3(n[i*3],n[i*3+1],-n[i*3+2])).ToArray();}else mesh.RecalculateNormals();
     if(a["TEXCOORD_0"]!=null){var uv=Floats((int)a["TEXCOORD_0"],2);mesh.uv=Enumerable.Range(0,uv.Length/2).Select(i=>new Vector2(uv[i*2],1-uv[i*2+1])).ToArray();}mesh.RecalculateBounds();ctx.AddObjectToAsset("mesh"+meshId++,mesh);primitives.Add(Tuple.Create(mesh,(int?)p["material"]??0));}meshes.Add(primitives);}
   var root=new GameObject(Path.GetFileNameWithoutExtension(ctx.assetPath));var nodes=doc["nodes"].Select((n,i)=>new GameObject((string)n["name"]??"node_"+i)).ToArray();
   for(int i=0;i<nodes.Length;i++){var n=doc["nodes"][i];var tr=nodes[i].transform;tr.SetParent(root.transform,false);
    if(n["matrix"]!=null){var a=n["matrix"];var matrix=new Matrix4x4();for(int c=0;c<4;c++)for(int r=0;r<4;r++)matrix[r,c]=(float)a[c*4+r];var flip=Matrix4x4.Scale(new Vector3(1,1,-1));matrix=flip*matrix*flip;tr.localPosition=matrix.GetColumn(3);tr.localRotation=matrix.rotation;tr.localScale=matrix.lossyScale;}
    else{tr.localPosition=V(n["translation"],Vector3.zero,true);tr.localScale=V(n["scale"],Vector3.one);var q=n["rotation"];if(q!=null)tr.localRotation=new Quaternion(-(float)q[0],-(float)q[1],(float)q[2],(float)q[3]);}
    if(n["mesh"]!=null)foreach(var p in meshes[(int)n["mesh"]]){var go=new GameObject("primitive");go.transform.SetParent(tr,false);go.AddComponent<MeshFilter>().sharedMesh=p.Item1;go.AddComponent<MeshRenderer>().sharedMaterial=mats[p.Item2];}
   }
   for(int i=0;i<nodes.Length;i++)foreach(var child in doc["nodes"][i]["children"]??new JArray())nodes[(int)child].transform.SetParent(nodes[i].transform,false);
   var animation=root.AddComponent<Animation>();int clipIndex=0;
   foreach(var a in doc["animations"]??new JArray()){
    var clip=new AnimationClip{name=(string)a["name"]??"Idle",legacy=true,wrapMode=WrapMode.Loop};
    foreach(var channel in a["channels"]){var sampler=a["samplers"][(int)channel["sampler"]];var target=channel["target"];string property=(string)target["path"];int components=property=="rotation"?4:3;var times=Floats((int)sampler["input"],1);var values=Floats((int)sampler["output"],components);var tr=nodes[(int)target["node"]].transform;string nodePath=UnityEditor.AnimationUtility.CalculateTransformPath(tr,root.transform);
     string prefix=property=="translation"?"localPosition":property=="rotation"?"localRotation":"localScale";
     for(int k=0;k<components;k++){var keys=new Keyframe[times.Length];float sign=property=="translation"&&k==2||property=="rotation"&&k<2?-1:1;for(int f=0;f<times.Length;f++)keys[f]=new Keyframe(times[f],values[f*components+k]*sign);clip.SetCurve(nodePath,typeof(Transform),prefix+"."+"xyzw"[k],new AnimationCurve(keys));}
    }
    clip.EnsureQuaternionContinuity();ctx.AddObjectToAsset("clip"+clipIndex++,clip);animation.AddClip(clip,clip.name);if(animation.clip==null)animation.clip=clip;
   }
   animation.playAutomatically=true;ctx.AddObjectToAsset("root",root);ctx.SetMainObject(root);
  }
 }
}
