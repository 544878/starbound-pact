using System;
using System.Collections.Generic;
using System.Linq;

namespace Starbound {
 public class Operator {public string id,role;public int x,y,direction,hits;public double hp,timer,cooldown,skill;public UnitStats stats;}
 public class Invader {public int id;public double progress,hp,maxHp,speed,attack,defense,timer;}
 public class Defense {
  public static readonly int[,] Path={{0,2},{1,2},{2,2},{2,1},{3,1},{4,1},{5,1},{5,2},{5,3},{6,3},{7,3},{8,3}};
  public double dp=35,time,spawnTimer;public int health=10,wave=1,spawned,kills,nextId=1;
  public List<Invader> enemies=new List<Invader>();public List<Operator> operators=new List<Operator>();
  public Dictionary<string,double> redeploy=new Dictionary<string,double>();public string phase="prepare";
  public static bool Ground(int x,int y){for(int i=0;i<12;i++)if(Path[i,0]==x&&Path[i,1]==y)return true;return false;}
  public static int Cost(Companion c){return c.role=="guardian"?16:c.role=="support"?12:18;}
  public static double[] Position(Invader e){int i=Math.Min(11,(int)e.progress),j=Math.Min(i+1,11);double t=e.progress-i;return new[]{Path[i,0]+(Path[j,0]-Path[i,0])*t,Path[i,1]+(Path[j,1]-Path[i,1])*t};}
  public static bool Range(Operator o,double x,double y){double dx=x-o.x,dy=y-o.y;return Math.Abs(dx)+Math.Abs(dy)<=(o.role=="guardian"?1.25:3.25)&&new[]{dx,dy,-dx,-dy}[o.direction]>=-.4;}
  public bool Deploy(Companion c,int x,int y,int direction,Catalog cat,IEnumerable<Weapon> weapons) {
   if(phase=="won"||phase=="lost"||x<0||x>8||y<0||y>4||x==0&&y==2||x==8&&y==3||dp<Cost(c)||operators.Any(o=>o.id==c.id||o.x==x&&o.y==y)||redeploy.ContainsKey(c.id)&&redeploy[c.id]>0)return false;
   if((c.role=="guardian"||c.role=="striker")!=Ground(x,y))return false;
   var v=Growth.Stats(c,cat,weapons);dp-=Cost(c);operators.Add(new Operator{id=c.id,x=x,y=y,direction=direction,hp=v.hp,stats=v,role=c.role});return true;
  }
  public void Retreat(string id){var o=operators.FirstOrDefault(v=>v.id==id);if(o==null||phase=="won"||phase=="lost")return;dp=Math.Min(99,dp+(o.role=="guardian"?8:o.role=="support"?6:9));operators.Remove(o);redeploy[id]=15;}
  public void Skill(string id){var o=operators.FirstOrDefault(v=>v.id==id);if(phase=="running"&&o!=null&&o.cooldown<=0){o.skill=6;o.cooldown=20;}}
  public void Start(){if(phase=="prepare"||phase=="between"){phase="running";spawned=0;spawnTimer=0;}}
  public void Tick(double dt) {
   if(phase!="running"||dt<=0)return;dp=Math.Min(99,dp+dt);time+=dt;spawnTimer-=dt;
   foreach(var o in operators){o.timer-=dt;o.cooldown=Math.Max(0,o.cooldown-dt);o.skill=Math.Max(0,o.skill-dt);}
   foreach(var id in redeploy.Keys.ToArray())redeploy[id]=Math.Max(0,redeploy[id]-dt);
   int total=4+wave*2;if(spawnTimer<=0&&spawned<total){bool elite=spawned==total-1;double hp=220+wave*85+(elite?220:0);enemies.Add(new Invader{id=nextId++,hp=hp,maxHp=hp,speed=elite?.35:.5,attack=30+wave*14,defense=10+wave*3});spawned++;spawnTimer=2;}
   var blocked=new Dictionary<string,int>();
   foreach(var e in enemies){var at=Position(e);var blocker=operators.FirstOrDefault(o=>o.hp>0&&Ground(o.x,o.y)&&Math.Abs(o.x-at[0])+Math.Abs(o.y-at[1])<.65&&(!blocked.ContainsKey(o.id)||blocked[o.id]<(o.role=="guardian"?3:1)));
    if(blocker!=null){blocked[blocker.id]=(blocked.ContainsKey(blocker.id)?blocked[blocker.id]:0)+1;e.timer-=dt;if(e.timer<=0){blocker.hp-=Math.Max(1,e.attack-blocker.stats.defense)*(blocker.skill>0?.5:1)*(blocker.stats.Has("guard")?.92:1);e.timer=1;}}
    else e.progress+=e.speed*dt;
   }
   foreach(var o in operators.Where(o=>o.hp>0&&o.timer<=0).ToArray()){
    var targets=enemies.Where(e=>e.hp>0&&Range(o,Position(e)[0],Position(e)[1])).OrderByDescending(e=>e.progress).ToArray();
    if(o.role=="support"){var target=operators.Where(t=>t.hp>0&&t.hp<t.stats.hp&&Range(o,t.x,t.y)).OrderBy(t=>t.hp/t.stats.hp).FirstOrDefault();if(target!=null){target.hp=Math.Min(target.stats.hp,target.hp+o.stats.attack*o.stats.healing*(o.skill>0?2:1));o.timer=o.stats.interval;}}
    else if(targets.Length>0){o.hits++;var victim=targets[0];int value=Growth.Damage(o.stats,new UnitStats{hp=victim.maxHp,defense=victim.defense},victim.hp,o.hits,o.skill>0?2:1);victim.hp-=value;if(o.stats.Has("leech"))o.hp=Math.Min(o.stats.hp,o.hp+value*.15);o.timer=o.stats.interval;if(o.role=="mystic"&&o.skill>0)foreach(var e in targets.Skip(1))e.hp-=value*.5;}
    if(o.timer>0&&o.stats.Has("regeneration"))o.hp=Math.Min(o.stats.hp,o.hp+o.stats.hp*.02);
   }
   kills+=enemies.Count(e=>e.hp<=0);health-=enemies.Count(e=>e.hp>0&&e.progress>=11);enemies.RemoveAll(e=>e.hp<=0||e.progress>=11);
   foreach(var o in operators.Where(o=>o.hp<=0))redeploy[o.id]=15;operators.RemoveAll(o=>o.hp<=0);
   if(health<=0){health=0;phase="lost";}else if(spawned==total&&enemies.Count==0){if(wave==5)phase="won";else{wave++;phase="between";dp=Math.Min(99,dp+10);}}
  }
 }
}
