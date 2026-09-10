using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace Starbound {
 public class BattleStage : MonoBehaviour {
  public Camera cameraView;public bool busy,overview;public float speed=1;
  GameObject world;GameObject[] actors=new GameObject[6];Vector3[] homes=new Vector3[6];
  Material stone,gold;readonly List<Material> generated=new List<Material>();
  public void Build(){world=new GameObject("Moonlit arena");world.transform.SetParent(transform);
   var cam=new GameObject("Battle camera");cam.transform.SetParent(world.transform);cameraView=cam.AddComponent<Camera>();cameraView.fieldOfView=40;cameraView.clearFlags=CameraClearFlags.SolidColor;cameraView.backgroundColor=new Color(.025f,.04f,.09f);cameraView.nearClipPlane=.1f;cameraView.farClipPlane=180;
   RenderSettings.ambientLight=new Color(.42f,.49f,.64f);RenderSettings.fog=true;RenderSettings.fogColor=cameraView.backgroundColor;RenderSettings.fogDensity=.013f;
   var light=new GameObject("Moon key");light.transform.SetParent(world.transform);var l=light.AddComponent<Light>();l.type=LightType.Directional;l.color=new Color(.76f,.86f,1);l.intensity=1.45f;l.shadows=LightShadows.Soft;light.transform.rotation=Quaternion.Euler(48,-30,0);
   stone=Mat(new Color(.46f,.51f,.60f));stone.mainTexture=Resources.Load<Texture2D>("Art/astral-marble");stone.mainTextureScale=new Vector2(4,4);gold=Mat(new Color(.75f,.58f,.30f),true);
   Primitive("Moon dais",PrimitiveType.Cylinder,new Vector3(0,-.35f,0),new Vector3(17,.3f,17),stone);
   for(int i=0;i<3;i++)Ring(Vector3.zero,5.3f+i*1.05f,gold);
   for(int i=0;i<16;i++){float a=i*Mathf.PI*2/16;Primitive("Outer pillar",PrimitiveType.Cube,new Vector3(Mathf.Sin(a)*12,-.5f,Mathf.Cos(a)*12),new Vector3(.8f,4+i%3,.8f),stone);}
   string[] model={"guardian","healer","striker","mage","specialist","astral-guardian"};
   homes=new[]{new Vector3(0,0,-1),new Vector3(-3,0,-4),new Vector3(-2,0,-2),new Vector3(2,0,-2.5f),new Vector3(3,0,-4),new Vector3(0,1.8f,4)};
   for(int i=0;i<6;i++){var prefab=Resources.Load<GameObject>("Models/"+model[i]);if(prefab==null){Debug.LogError("Missing imported model: "+model[i]);continue;}actors[i]=Instantiate(prefab,world.transform);actors[i].transform.position=homes[i];actors[i].transform.rotation=Quaternion.Euler(0,i==5?0:180,0);if(i==5)actors[i].transform.localScale=Vector3.one*1.4f;Ring(new Vector3(homes[i].x,.02f,homes[i].z),i==5?1.4f:.5f,gold);}
   var sky=Primitive("Sky panorama",PrimitiveType.Quad,new Vector3(0,13,35),new Vector3(95,52,1),Mat(Color.white));sky.GetComponent<Renderer>().material.shader=Shader.Find("Unlit/Texture");sky.GetComponent<Renderer>().material.mainTexture=Resources.Load<Texture2D>("Art/astral-sky");
   SnapCamera();Show(false);
  }
  Material Mat(Color color,bool glow=false){var m=new Material(Shader.Find("Standard"));m.color=color;if(glow){m.EnableKeyword("_EMISSION");m.SetColor("_EmissionColor",color*.4f);}generated.Add(m);return m;}
  GameObject Primitive(string name,PrimitiveType type,Vector3 position,Vector3 scale,Material material){var go=GameObject.CreatePrimitive(type);go.name=name;go.transform.SetParent(world.transform);go.transform.position=position;go.transform.localScale=scale;go.GetComponent<Renderer>().sharedMaterial=material;Destroy(go.GetComponent<Collider>());return go;}
  void Ring(Vector3 center,float radius,Material material){var go=new GameObject("Astral ring");go.transform.SetParent(world.transform);var line=go.AddComponent<LineRenderer>();line.sharedMaterial=material;line.positionCount=97;line.startWidth=line.endWidth=.025f;for(int i=0;i<97;i++){float a=i*Mathf.PI*2/96;line.SetPosition(i,center+new Vector3(Mathf.Sin(a)*radius,.01f,Mathf.Cos(a)*radius));}}
  void SnapCamera(){cameraView.transform.position=overview?new Vector3(11,12,-15):new Vector3(9,6,-12);cameraView.transform.LookAt(new Vector3(0,1,0));}
  void Update(){if(world!=null&&world.activeSelf&&!busy){var target=overview?new Vector3(11,12,-15):new Vector3(9,6,-12);cameraView.transform.position=Vector3.Lerp(cameraView.transform.position,target,Time.deltaTime*3);cameraView.transform.LookAt(new Vector3(0,1,0));}}
  public void Show(bool show){if(world!=null)world.SetActive(show);}
  public void ResetActors(){for(int i=0;i<6;i++)if(actors[i]!=null){actors[i].SetActive(true);actors[i].transform.position=homes[i];}}
  public void Perform(AstralBattle battle,string command,System.Action<AstralEvent> complete){if(!busy)StartCoroutine(Animate(battle,command,complete));}
  IEnumerator Animate(AstralBattle battle,string command,System.Action<AstralEvent> complete){busy=true;int index=battle.active;var actor=actors[index];Vector3 start=homes[index],end=index==5?start+Vector3.back*.8f:start+Vector3.forward*1.2f;var animation=actor==null?null:actor.GetComponent<Animation>();if(animation!=null&&animation.GetClip("Attack")!=null)animation.CrossFade("Attack");float elapsed=0;bool applied=false;float duration=.9f/Mathf.Max(1,speed);
   while(elapsed<duration){elapsed+=Time.deltaTime;float t=Mathf.Clamp01(elapsed/duration);if(actor!=null)actor.transform.position=Vector3.Lerp(start,end,Mathf.Sin(t*Mathf.PI));
    if(!applied&&t>=.44f){applied=true;var e=battle.Act(command);complete(e);if(e!=null)StartCoroutine(Flash(index==5?homes[0]+Vector3.up:homes[5],command=="ultimate"?2:1));}
    yield return null;
   }
   if(actor!=null)actor.transform.position=start;if(animation!=null)animation.CrossFade("Idle");for(int i=0;i<5;i++)if(actors[i]!=null)actors[i].SetActive(battle.units[i].hp>0);busy=false;
  }
  IEnumerator Flash(Vector3 at,float size){var go=Primitive("Hit flash",PrimitiveType.Sphere,at,Vector3.one*.2f,gold);float elapsed=0;while(elapsed<.28f){elapsed+=Time.deltaTime;go.transform.localScale=Vector3.one*(elapsed*size*4);yield return null;}Destroy(go);}
  void OnDestroy(){foreach(var mat in generated)Destroy(mat);}
 }
}
