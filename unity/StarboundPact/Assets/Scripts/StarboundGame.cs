using System;
using System.IO;
using System.Linq;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace Starbound {
 public partial class StarboundGame : MonoBehaviour {
  public GameSession game;public BattleStage stage;public string screen="home";Camera uiCamera;
  string selected="lumi",pathId="mortal",banner="limited",taskType="daily",activity="defense";
  AstralBattle battle;Defense defense;War war;Duel duel;List<string>[] duelPicks={new List<string>(),new List<string>()};
  string duelActor;bool duelSkill,paused,auto,claimed;int direction,speed=1;float autoAt;string encounter="trial",stageId;int towerId;
  Texture2D roster,background,garden,defenders,invaders;Font font;GUIStyle label,button;Dictionary<string,Texture2D> textures=new Dictionary<string,Texture2D>();
  Vector2 scroll;string importPath="",message="";bool quitPrompt;float scale;Vector2 offset;
  readonly Color ink=new Color(.91f,.94f,1),muted=new Color(.61f,.69f,.79f),accent=new Color(.84f,.72f,.48f),panel=new Color(.025f,.055f,.105f,.94f);
  SaveData S {get{return game.save;}} Catalog C {get{return game.catalog;}}
  [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)] static void Boot(){if(FindFirstObjectByType<StarboundGame>()==null)new GameObject("Starbound Pact").AddComponent<StarboundGame>();}
  void Awake(){Application.targetFrameRate=60;game=new GameSession(Resources.Load<TextAsset>("Data/catalog").text,Resources.Load<TextAsset>("Data/initial-save").text,Application.persistentDataPath);message=game.notice;
   font=Font.CreateDynamicFontFromOSFont(new[]{"Microsoft YaHei","SimHei","Arial"},22);
   roster=Resources.Load<Texture2D>("Art/roster-v5");background=Resources.Load<Texture2D>("Art/academy-garden");garden=Resources.Load<Texture2D>("Art/defense-garden-v4");defenders=Resources.Load<Texture2D>("Art/defense-characters-v4");invaders=Resources.Load<Texture2D>("Art/defense-enemies-v4");
   uiCamera=new GameObject("Interface camera").AddComponent<Camera>();uiCamera.clearFlags=CameraClearFlags.SolidColor;uiCamera.backgroundColor=Color.black;uiCamera.cullingMask=0;
   stage=gameObject.AddComponent<BattleStage>();stage.Build();defense=new Defense();war=new War(C);
   if(Environment.GetCommandLineArgs().Contains("-starboundSmoke"))StartCoroutine(Smoke());
  }
  void Update(){
   if(screen=="battle"&&battle!=null&&battle.outcome=="playing"&&!stage.busy&&Time.time>=autoAt&&(auto||battle.active==5)){Command(battle.active<5&&battle.Can("ultimate")?"ultimate":battle.active<5&&battle.Can("skill")?"skill":"basic");autoAt=Time.time+.8f/speed;}
   if(screen=="activities"&&activity=="defense"&&!paused){double dt=Math.Min(Time.deltaTime,.1)*speed;while(dt>0){double step=Math.Min(dt,1.0/30);defense.Tick(step);dt-=step;}}
   if(screen=="battle"&&!stage.busy){if(Input.GetKeyDown(KeyCode.Q))Command("basic");if(Input.GetKeyDown(KeyCode.E))Command("skill");if(Input.GetKeyDown(KeyCode.R))Command("ultimate");}
   if(Input.GetKeyDown(KeyCode.Escape))quitPrompt=!quitPrompt;
   if(Input.GetKeyDown(KeyCode.F11))Screen.fullScreen=!Screen.fullScreen;
  }
  void OnApplicationQuit(){game.Store();}
  void OnApplicationPause(bool pause){if(pause&&game!=null)game.Store();}
  void InitStyles(){if(label!=null)return;label=new GUIStyle(GUI.skin.label){font=font,wordWrap=true,fontSize=22,normal={textColor=ink}};button=new GUIStyle(GUI.skin.button){font=font,fontSize=21,wordWrap=true,alignment=TextAnchor.MiddleCenter,border=new RectOffset(2,2,2,2),padding=new RectOffset(12,12,6,6)};
   button.normal.background=Tex("button",new Color(.10f,.17f,.25f));button.hover.background=Tex("hover",new Color(.20f,.29f,.38f));button.active.background=Tex("active",new Color(.34f,.35f,.34f));button.normal.textColor=ink;button.hover.textColor=Color.white;button.active.textColor=accent;
  }
  Texture2D Tex(string id,Color color){if(textures.ContainsKey(id))return textures[id];var t=new Texture2D(1,1);t.SetPixel(0,0,color);t.Apply();textures[id]=t;return t;}
  void Fill(Rect r,Color color){var prev=GUI.color;GUI.color=color;GUI.DrawTexture(r,Texture2D.whiteTexture);GUI.color=prev;}
  void Text(string text,float x,float y,float w=500,float h=40,int size=22,Color? color=null){label.fontSize=size;label.normal.textColor=color??ink;GUI.Label(new Rect(x,y,w,h),text??"",label);}
  bool Btn(string text,float x,float y,float w=180,float h=48,bool enabled=true,bool active=false){bool before=GUI.enabled;GUI.enabled=before&&enabled;var old=GUI.backgroundColor;if(active)GUI.backgroundColor=new Color(1.4f,1.2f,.75f);bool hit=GUI.Button(new Rect(x,y,w,h),text,button);GUI.backgroundColor=old;GUI.enabled=before;return hit;}
  void Panel(float x,float y,float w,float h){Fill(new Rect(x,y,w,h),panel);Fill(new Rect(x,y,w,1),new Color(.50f,.58f,.66f,.4f));}
  void Bar(float x,float y,float w,float h,double current,double max,Color color){Fill(new Rect(x,y,w,h),new Color(.1f,.13f,.18f));Fill(new Rect(x,y,w*(float)Mathx.Clamp(max>0?current/max:0,0,1),h),color);}
  void Portrait(string id,float x,float y,float w,float h){int index=Array.FindIndex(C.companions,c=>c.id==id);if(index<0)return;GUI.DrawTextureWithTexCoords(new Rect(x,y,w,h),roster,new Rect(index/7f,0,1/7f,1));}
  string Name(string id){return C.companions.FirstOrDefault(c=>c.id==id)?.name??C.weapons.FirstOrDefault(w=>w.id==id)?.name??id;}
  string Role(string role){return role=="guardian"?"守护":role=="striker"?"强攻":role=="mystic"?"灵术":"辅助";}
  void Go(string page){screen=page;scroll=Vector2.zero;stage.Show(page=="battle");uiCamera.enabled=page!="battle";message="";}
  void OnGUI(){InitStyles();scale=Mathf.Min(Screen.width/1600f,Screen.height/900f);offset=new Vector2((Screen.width-1600*scale)/2,(Screen.height-900*scale)/2);GUI.matrix=Matrix4x4.TRS(new Vector3(offset.x,offset.y,0),Quaternion.identity,new Vector3(scale,scale,1));
   if(screen!="battle"){GUI.DrawTexture(new Rect(0,0,1600,900),background,ScaleMode.ScaleAndCrop);Fill(new Rect(0,0,1600,900),new Color(.02f,.035f,.065f,.85f));Header();}
   switch(screen){case "home":Home();break;case "growth":GrowthPage();break;case "summon":SummonPage();break;case "formation":Formation();break;case "battle":BattlePage();break;case "activities":Activities();break;case "tasks":TasksPage();break;case "story":StoryPage();break;case "tower":TowerPage();break;case "inventory":Inventory();break;case "homestead":Homestead();break;case "settings":Settings();break;case "more":More();break;}
   if(!string.IsNullOrEmpty(message)){Panel(350,818,900,56);Text(message,374,829,850,40,19,accent);}
   if(quitPrompt){Fill(new Rect(0,0,1600,900),new Color(0,0,0,.7f));Panel(550,315,500,250);Text("返回主页？",590,348,400,50,30);Text("当前战局将结束，养成进度已保存。",590,408,400,50,20);if(Btn("继续游戏",590,485,180)){quitPrompt=false;}if(Btn("返回主页",810,485,180)){quitPrompt=false;StopAllCoroutines();stage.StopAllCoroutines();stage.busy=false;Go("home");}}
  }
  void Header(){Panel(0,0,1600,86);Text("星契纪元",36,22,240,50,30,accent);Text("STARBOUND PACT",216,31,210,35,14,muted);Text("星晶  "+S.crystals+"     金币  "+S.gold.ToString("N0")+"     体力  "+S.stamina+" / 240",920,27,650,40,21);
   string[] pages={"home","growth","summon","activities","more"},names={"花庭主页","角色养成","星契祈愿","进入作战","更多"};for(int i=0;i<5;i++)if(Btn(names[i],38+i*185,102,170,46,true,screen==pages[i]))Go(pages[i]);
  }
  void Title(string title,string subtitle){Text(title,42,175,1200,60,36,accent);Text(subtitle,44,236,1470,55,20,muted);}
  void Home(){Portrait("lumi",995,173,475,626);Text("风从塔顶来",64,243,900,80,55);Text("与群星缔约，为彼此而战。",68,331,700,55,28,accent);Text("月下花庭 · 指挥官 Lv."+S.playerLevel,68,409,760,50,23,muted);Text("五人星阵、庭院守卫与星契养成。\n选择同伴，开启今日的旅程。",68,474,760,100,26);
   if(Btn("开始星阵试炼",70,631,300,66))Go("formation");if(Btn("守护花庭",395,631,245,66)){activity="defense";Go("activities");}
   if(Btn("领取任务奖励",70,726,250))Go("tasks");if(Btn("前往家园",344,726,250))Go("homestead");}
  void RosterRail(float y=680){for(int i=0;i<S.companions.Count;i++){var c=S.companions[i];float x=44+i*216;Portrait(c.id,x,y,60,112);if(Btn(c.name+"\nLv."+c.level,x+64,y,144,70,true,selected==c.id))selected=c.id;}}
  void GrowthPage(){var c=game.Character(selected);var stats=Growth.Stats(c,C,S.weapons);Title(c.name+" · "+c.title,c.rarity+"  /  "+Role(c.role)+"  /  命座 "+c.constellation+" / 6");Portrait(c.id,50,298,190,356);Panel(272,294,520,360);Text(c.biography,292,313,470,95,21);Text("生命 "+stats.hp+"     攻击 "+stats.attack+"     防御 "+stats.defense,294,419,470,45,21);if(Btn("升级  ·  400 金币",294,480,270,52,c.level<90&&S.gold>=400)){game.Level(c.id);message="角色已升级";}
   Text("武器（一个装备槽）",294,551,440,35,20,accent);for(int i=0;i<S.weapons.Count;i++){var w=S.weapons[i];if(Btn(w.name,294+i%2*238,590+i/2*52,224,46,true,w.ownerId==c.id))game.Equip(c.id,w.id);}
   Panel(816,294,734,360);Text("九环共鸣",842,314,640,40,27,accent);var rings=Growth.Rings(c,C);Text("前六环随等级 1 / 10 / 20 / 30 / 40 / 50 解锁",842,363,670,38,19,muted);Text(string.Join("  ·  ",C.rings.Take(6).Select(r=>r.name+(rings.Contains(r)?" ✓":""))),842,408,670,44,20);
   for(int i=0;i<3;i++){int slot=i;float y=465+i*59;string id=c.rings!=null&&c.rings.Length>i?c.rings[i]:null;Text((i+7)+"环  "+(C.rings.FirstOrDefault(r=>r.id==id)?.name??"未装备"),842,y,200,48,19);if(Btn("通用",1048,y,96,46))game.Ring(c.id,slot,false);if(Btn("专属",1152,y,96,46,game.Material("ring:"+c.id+":"+i)>0))game.Ring(c.id,slot,true);if(Btn("定向 160",1257,y,153,46,S.crystals>=160&&game.Material("ring:"+c.id+":"+i)==0)){game.PullRing(c.id,slot);message=game.notice;}Text(game.Material("ring:"+c.id+":"+i+":pity")+"/30",1420,y+9,100,40,18,muted);}
   RosterRail(706);
  }
  void SummonPage(){Title("星穹回响","本地虚拟星晶 · 每次 160 · 五星 80 次硬保底 · 重复角色提升命座（上限六命）");string[] pools={"limited","standard","weapon"},names={"星璃限定","常驻角色","武器祈愿"};for(int i=0;i<3;i++)if(Btn(names[i],45+i*242,300,225,52,true,banner==pools[i]))banner=pools[i];Portrait(banner=="limited"?"astra":"selene",1170,303,288,506);
   int pity=banner=="limited"?S.pityLimited:banner=="weapon"?S.pityWeapon:S.pityCharacter;Text("距上次五星："+pity+" / 80",50,390,1000,55,29,accent);Text(banner=="weapon"?"五星基础概率 2%":banner=="limited"?"五星基础概率 1.6%，五星 50% 为星璃；未命中则下次五星必为星璃。":"五星基础概率 1.6%，五星角色来自常驻池。",50,460,1050,80,22);if(banner=="limited")Text(S.limitedGuaranteed?"下次五星必为星璃":"当前无定轨保证",50,540,1000,40,22,accent);
   if(Btn("祈愿一次  160",50,617,280,64,S.crystals>=160)){var r=game.Summon(banner,1);message=string.Join(" · ",r.Select(p=>Name(p.id)+" "+p.rarity));}if(Btn("祈愿十次  1600",355,617,300,64,S.crystals>=1600)){var r=game.Summon(banner,10);message=string.Join(" / ",r.Select(p=>Name(p.id)));}
   Text("最近祈愿",50,718,400,40,22,accent);Text(string.Join("  ·  ",S.pullHistory.Take(6).Select(p=>Name(p.id)+" "+p.rarity)),50,763,1050,60,19);
  }
  void Formation(){Title("五人星阵","先选择下方角色，再点击阵位放置；再次点击已占阵位可移除。最多五名不同角色。");
   for(int i=0;i<9;i++){int slot=i;float x=65+(i%3)*175,y=309+(i/3)*104;string id=S.formation[i];if(Btn(id==null?"空阵位 "+(i+1):Name(id),x,y,160,88,true,id!=null)){
     if(id!=null)S.formation[slot]=null;else if(S.formation.Count(v=>v!=null)<5||S.formation.Contains(selected)){for(int k=0;k<9;k++)if(S.formation[k]==selected)S.formation[k]=null;S.formation[slot]=selected;}game.Store();}}
   Text("调谐体系",670,310,850,45,26,accent);for(int i=0;i<C.paths.Length;i++){var p=C.paths[i];if(Btn(p.name,670+i%4*211,368+i/4*69,198,56,true,pathId==p.id))pathId=p.id;}
   Text(C.paths.First(p=>p.id==pathId).strengths,675,526,840,70,22,muted);if(Btn("出战 "+S.formation.Count(v=>v!=null)+" / 5  ·  开始试炼",675,612,650,60,S.formation.Count(v=>v!=null)==5&&S.stamina>=6))StartBattle("trial");RosterRail(714);
  }
  void StartBattle(string kind,string id=null,int floor=0){var party=S.formation.Where(v=>v!=null).Select(game.Character).ToArray();if(party.Length!=5){message="请先编入五名同伴";return;}int cost=kind=="story"?C.chapters.SelectMany(c=>c.stages).First(v=>v.id==id).staminaCost:6;if(S.stamina<cost){message="体力不足，可前往家园收取";return;}
   S.stamina-=cost;S.battleSeed++;game.Store();encounter=kind;stageId=id;towerId=floor;battle=new AstralBattle(party,S.weapons,C,pathId);claimed=false;auto=false;stage.ResetActors();Go("battle");}
  void Command(string command){if(battle==null||stage.busy||battle.active<5&&!battle.Can(command)||battle.outcome!="playing")return;stage.speed=speed;stage.Perform(battle,command,e=>{});}
  void BattlePage(){Panel(0,0,1600,98);Text("星骸守阵者",560,14,650,38,27,accent);Bar(455,65,690,10,battle.bossHp,battle.bossMaxHp,new Color(.72f,.37f,.42f));Text(Mathx.Round(battle.bossHp)+" / "+battle.bossMaxHp,1160,52,300,40,20);if(Btn("返回",25,23,120))quitPrompt=true;
   Panel(25,124,290,154);Text(pathId==null?"":battle.path.name+" · 第 "+battle.round+" 回合",42,143,265,46,23,accent);Text("战技点 "+battle.points+" / 5\n阵线联动 "+Mathx.Round(battle.Link()*100)+"%",42,198,264,77,23);if(Btn(auto?"自动：开":"自动：关",1285,126,280))auto=!auto;if(Btn("速度 "+speed+"×",1285,184,132))speed=speed==1?2:1;if(Btn("全阵视角",1430,184,135))stage.overview=!stage.overview;
   for(int i=0;i<5;i++){var u=battle.units[i];float x=25+i*218;Panel(x,707,206,151);Text(RoleName(i)+" · "+u.companion.name,x+10,719,190,35,20,i==battle.active?accent:ink);Bar(x+10,763,183,9,u.hp,u.maxHp,new Color(.37f,.73f,.61f));Text(Mathx.Round(u.hp)+" / "+u.maxHp,x+10,782,190,32,18);Text("能量 "+u.energy,x+10,821,190,30,18,muted);}
   if(battle.outcome=="playing"){Text(stage.busy?"星契演出中…":battle.active==5?"敌方行动":battle.units[battle.active].companion.name+" 行动",1128,650,440,48,25,accent);if(Btn("Q  普攻",1128,714,140,66,!stage.busy&&battle.Can("basic")))Command("basic");if(Btn("E  战技",1279,714,140,66,!stage.busy&&battle.Can("skill")))Command("skill");if(Btn("R  终结技",1430,714,145,66,!stage.busy&&battle.Can("ultimate")))Command("ultimate");}
   else {Panel(540,303,600,290);Text(battle.outcome=="win"?"星契共鸣 · 战斗胜利":"阵线失守",576,337,530,70,38,accent);Text("累计伤害 "+battle.totalDamage+" · "+battle.round+" 回合",578,422,530,40,23);if(Btn(battle.outcome=="win"?"领取奖励并返回":"返回编队",615,500,450,58,!stage.busy)){if(battle.outcome=="win")ClaimBattle();else Go("formation");}}
   if(battle.log.Count>0){Panel(350,111,880,47);Text(battle.log[0],368,118,842,40,20);}
  }
  string RoleName(int i){return AstralBattle.RoleNames[i];}
  void ClaimBattle(){if(claimed)return;claimed=true;if(encounter=="story"){if(!S.completedStages.Contains(stageId)){var r=C.chapters.SelectMany(c=>c.stages).First(v=>v.id==stageId).firstClearRewards;game.Grant(r);S.completedStages.Add(stageId);S.playerExp+=200;}}
   else if(encounter=="tower"){var f=C.floors.First(v=>v.floor==towerId);game.Grant(towerId>S.highestTowerFloor?f.firstClearRewards:f.sweepRewards);S.highestTowerFloor=Math.Max(S.highestTowerFloor,towerId);S.towerFloor=Math.Min(C.floors.Length,towerId+1);}
   else{S.gold+=1800;S.crystals+=40;game.AddItems(new[]{new Item{name="战术经验书",count=2},new Item{name="曜金碎屑",count=2}});}
   game.Store();Go("home");message="战斗奖励已领取，进度已保存";}
  void More(){Title("旅途手册","管理成长、剧情与本地进度");string[] pages={"formation","tasks","story","tower","inventory","homestead","settings"},names={"五人编队","任务奖励","主线与委托","风语深塔","材料背包","花庭家园","存档与设置"};for(int i=0;i<pages.Length;i++)if(Btn(names[i],60+i%3*505,321+i/3*139,465,105))Go(pages[i]);}
  void Settings(){Title("存档与设置","养成进度自动保存在本机；退出和重启后可继续。");Text("存档位置",52,312,1400,45,25,accent);Text(game.storagePath,52,364,1450,64,20);Text("导入网页存档 JSON 文件（填入完整文件路径）",52,465,1450,44,23);GUI.skin.textField.font=font;GUI.skin.textField.fontSize=22;importPath=GUI.TextField(new Rect(52,530,1140,50),importPath);if(Btn("导入",1220,530,250,50,!string.IsNullOrWhiteSpace(importPath))){game.Import(importPath.Trim('"'));message=game.notice;}if(Btn("打开存档文件夹",52,638,340,55))Application.OpenURL("file:///"+Application.persistentDataPath);if(Btn("窗口 / 全屏（F11）",415,638,340,55))Screen.fullScreen=!Screen.fullScreen;if(Btn("保存并退出",780,638,300,55)){game.Store();Application.Quit();}}
  void OnDestroy(){foreach(var t in textures.Values)Destroy(t);}
 }
}
