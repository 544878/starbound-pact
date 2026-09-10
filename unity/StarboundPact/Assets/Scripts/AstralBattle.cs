using System;
using System.Collections.Generic;
using System.Linq;

namespace Starbound {
 public class AstralFighter {public Companion companion;public double hp,maxHp,attack,defense,healing;public int energy=50;}
 public class AstralEvent {public int actor;public string kind,title;public double damage,pursuit,dot,healing,reflected;public double[] incoming=new double[5];}
 public class AstralBattle {
  public List<AstralFighter> units=new List<AstralFighter>();
  public CombatPath path;public double bossHp=10500,bossMaxHp=10500,roundHealing,openingRatio=1,totalDamage;
  public int round=1,active,points=3,actions;public bool guard,empowered,lastHealing,lastHit;
  public string outcome="playing";public List<string> log=new List<string>{"五人入阵 · 星契已连结"};
  public static readonly string[] RoleNames={"抗伤","治疗","主攻","协攻","专辅"};
  public AstralBattle(IEnumerable<Companion> party,IEnumerable<Weapon> weapons,Catalog cat,string pathId="mortal") {
   path=cat.paths.First(p=>p.id==pathId);var pool=party.Take(5).ToList();var ordered=new List<Companion>();
   Func<Func<Companion,bool>,Companion> take=test=>{if(pool.Count==0)return null;int at=pool.FindIndex(c=>test(c));var c=pool[Math.Max(0,at)];pool.Remove(c);return c;};
   ordered.Add(take(c=>c.role=="guardian"));bool flora=pool.Any(c=>c.element=="flora");ordered.Add(take(c=>flora?c.element=="flora":c.role=="support"));ordered.Add(take(c=>c.role=="striker"));ordered.Add(take(c=>c.role=="striker"||c.role=="mystic"));ordered.Add(take(c=>true));
   double[] hp={2.2,1.2,1,1,1.1},atk={.12,.1,1,.8,.18},def={2.5,1.2,1,1,1.1};
   for(int i=0;i<ordered.Count;i++){var c=ordered[i];if(c==null)continue;var s=Growth.Stats(c,cat,weapons);units.Add(new AstralFighter{companion=c,hp=Mathx.Round(s.hp*hp[i]),maxHp=Mathx.Round(s.hp*hp[i]),attack=s.attack*atk[i]*3,defense=s.defense*def[i],healing=s.healing});}
   if(units.Count!=5)outcome="loss";
  }
  bool Alive(int i){return i<units.Count&&units[i].hp>0;}
  public double Link(){return Math.Min(.45,(Alive(0)?.06:0)+(Alive(1)?.06:0)+(Alive(2)&&Alive(3)?.1:0)+(Alive(4)?.2:0));}
  public bool Signature(){if(!Alive(4))return false;switch(path.id){case "inverse":return lastHit;case "mortal":return Alive(0)&&Alive(1);case "desire":return lastHealing;case "flame":return round>=3;case "dream":return true;case "memory":return round>=3&&Alive(2)&&Alive(3);case "end":return openingRatio<=.5;case "time":return round%3==0;default:return false;}}
  public bool Can(string command){return outcome=="playing"&&active<5&&Alive(active)&&(command!="skill"||points>0)&&(command!="ultimate"||units[active].energy>=100);}
  public AstralEvent Act(string command="basic") {
   bool enemy=active==5;if(outcome!="playing"||!enemy&&!Can(command))return null;
   var e=new AstralEvent{actor=active,kind=enemy?"enemy":command};actions++;bool signature=Signature();var s=path.stats;
   Action<AstralFighter,double> heal=(u,amount)=>{if(u.hp<=0)return;double actual=Math.Max(0,Math.Min(u.maxHp-u.hp,Mathx.Round(amount)));u.hp+=actual;e.healing+=actual;roundHealing+=actual;};
   Func<double,double> hit=amount=>{double actual=Math.Min(bossHp,Math.Max(0,Mathx.Round(amount)));bossHp-=actual;return actual;};
   if(enemy) {
    e.title=round%3==0?"天穹坠落":"星骸裁决";
    if(Alive(1))foreach(var u in units)heal(u,u.maxHp*.03*units[1].healing);
    int alive=units.Count(u=>u.hp>0);bool tank=Alive(0);
    for(int i=0;i<units.Count;i++){var u=units[i];if(u.hp<=0)continue;double share=tank&&alive>1?(i==0?.65:.35/(alive-1)):1.0/alive;
     double raw=820*(round%3==0?1.6:1)*share*(1000/(1000+Mathx.Clamp(u.defense,0,9000)))*(tank?.92:1)*(guard?.55:1);
     double loss=Math.Min(u.hp,Mathx.Round(raw));u.hp-=loss;e.incoming[i]=loss;u.energy=Math.Min(100,u.energy+12);
     if(u.hp>0)e.reflected+=hit(loss*s.reflect*(signature&&path.id=="inverse"?1.4:1));
    }
    lastHit=e.incoming.Any(n=>n>0);lastHealing=roundHealing>0;roundHealing=0;guard=false;round++;openingRatio=bossHp/bossMaxHp;active=0;
   }else {
    var actor=units[active];bool enhanced=command!="basic";
    if(command=="basic"){points=Math.Min(5,points+1);actor.energy=Math.Min(100,actor.energy+25);}
    if(command=="skill"){points--;actor.energy=Math.Min(100,actor.energy+35);}if(command=="ultimate")actor.energy=0;
    e.title=command=="ultimate"?"星契解放":actor.companion.skills[enhanced?1:0];
    if(enhanced&&active==0){guard=true;e.title="守誓 · 星盾展开";}
    if(enhanced&&active==1){foreach(var u in units)heal(u,u.maxHp*(command=="ultimate"?.35:.18)*actor.healing);e.title="春息 · 阵中回响";}
    if(enhanced&&active==4){empowered=true;e.title="星引 · 契约共鸣";}
    bool carry=active==2||active==3;
    double baseHit=actor.attack*(1000.0/1500)*(1+s.vulnerability);
    double phase=path.id=="time"&&round%3==0?.45:path.id=="end"&&openingRatio<=.3?.25:0;
    double directBuff=signature?(path.id=="mortal"?.08:path.id=="desire"||path.id=="dream"?.12:path.id=="end"?.2:0):0;
    double pursuitBuff=signature?(path.id=="mortal"?.12:path.id=="memory"?.3:path.id=="time"?.45:0):0;
    double common=(carry?Link():0)+(empowered&&Alive(4)&&carry?.15:0), mult=command=="ultimate"?2.8:enhanced&&carry?1.75:1;
    e.damage=hit(baseHit*(1+s.crit*(s.critDamage-1))*(1+phase+common+directBuff)*mult);
    e.pursuit=hit(baseHit*s.pursuit*(path.id=="memory"?Math.Min(round/3.0,1):1)*(1+common+pursuitBuff));
    e.dot=hit(baseHit*s.dot*Math.Min(round/3.0,1)*(1+common+(signature&&path.id=="flame"?.3:0)));
    heal(actor,Math.Min(actor.maxHp*.08,(e.damage+e.pursuit)*s.lifesteal));if(active==3)empowered=false;active++;
   }
   totalDamage+=e.damage+e.pursuit+e.dot+e.reflected;while(active<5&&!Alive(active))active++;
   outcome=bossHp<=0?"win":units.All(u=>u.hp<=0)?"loss":"playing";
   log.Insert(0,e.title+" · "+(enemy?"承伤 "+e.incoming.Sum()+" · 反伤 "+e.reflected:"伤害 "+(e.damage+e.pursuit+e.dot)+" · 治疗 "+e.healing));log=log.Take(8).ToList();return e;
  }
 }
}
