using System;
using System.Linq;
using System.Collections.Generic;

namespace Starbound {
 public class Recruit {public int uid,rank=1;public string id,zone="bench";public Recruit Clone(){return (Recruit)MemberwiseClone();}}
 public class War {
  public int round=1,gold=16,health=30,level=4,nextId=1,streak;public bool locked;
  public string phase="prepare",strategy="income";public List<string> log=new List<string>();public List<Recruit> roster=new List<Recruit>();public string[] shop;
  readonly Catalog cat;readonly Random random=new Random();
  public War(Catalog catalog){cat=catalog;Offers();}
  public int Cost(string id){return cat.companions.First(c=>c.id==id).rarity=="5星"?3:2;}
  void Offers(){shop=Enumerable.Range(0,5).Select(i=>cat.companions[random.Next(cat.companions.Length)].id).ToArray();}
  public void Refresh(){if(phase!="prepare"||gold<2)return;gold-=2;Offers();}
  public void Upgrade(){if(phase!="prepare"||gold<4||level>=8)return;gold-=4;level++;}
  public void Buy(int i){if(phase!="prepare"||i<0||i>=5||shop[i]==null||gold<Cost(shop[i]))return;string id=shop[i];
   var list=roster.Select(u=>u.Clone()).ToList();list.Add(new Recruit{uid=nextId,id=id});
   for(int rank=1;rank<3;rank++){var same=list.Where(u=>u.id==id&&u.rank==rank).ToList();if(same.Count>=3){var first=same.FirstOrDefault(u=>u.zone!="bench")??same[0];var upgraded=first.Clone();upgraded.rank++;var ids=same.Take(3).Select(u=>u.uid).ToArray();list.RemoveAll(u=>ids.Contains(u.uid));list.Add(upgraded);}}
   if(list.Count(u=>u.zone=="bench")>9)return;roster=list;gold-=Cost(id);shop[i]=null;nextId++;
  }
  public void Move(Recruit u,string zone){if(phase!="prepare"||!roster.Contains(u))return;var others=roster.Where(v=>v.uid!=u.uid).ToArray();if(zone=="bench"&&others.Count(v=>v.zone=="bench")>=9||zone!="bench"&&others.Count(v=>v.zone!="bench")>=level||zone=="front"&&others.Count(v=>v.zone=="front")>=4)return;u.zone=zone;}
  public void Sell(Recruit u){if(phase!="prepare"||!roster.Contains(u))return;gold+=Cost(u.id)*(int)Math.Pow(3,u.rank-1);roster.Remove(u);}
  class Unit{public Recruit r;public Companion c;public UnitStats s;public double hp;}
  public Dictionary<string,int> Bonds(){var ids=roster.Where(u=>u.zone!="bench").Select(u=>u.id).Distinct();return cat.companions.Where(c=>ids.Contains(c.id)).GroupBy(c=>c.role).ToDictionary(g=>g.Key,g=>g.Count());}
  public void Fight(IEnumerable<Companion> owned){if(phase!="prepare"||!roster.Any(u=>u.zone=="front"))return;
   var units=roster.Where(u=>u.zone!="bench").Select(u=>{var c=owned.FirstOrDefault(v=>v.id==u.id)??cat.companions.First(v=>v.id==u.id);var v=Growth.Stats(c,cat);if(v.Has("haste"))v.attack*=1.1;v.attack*= (1+(u.rank-1)*.7)*(strategy=="assault"?1.15:1);v.hp*=u.rank;return new Unit{r=u,c=c,s=v,hp=v.hp};}).ToArray();
   double enemyHp=800+round*300,enemyAttack=75+round*22;log.Clear();int synergy=Bonds().Count(b=>b.Value>=2);
   for(int tick=1;tick<=36&&enemyHp>0&&units.Any(u=>u.r.zone=="front"&&u.hp>0);tick++){
    foreach(var u in units.Where(u=>u.hp>0)){if(u.r.zone=="back"&&tick%3!=0)continue;
     if(u.c.role=="support"){var target=units.Where(v=>v.r.zone=="front"&&v.hp>0).OrderBy(v=>v.hp/v.s.hp).FirstOrDefault();if(target!=null)target.hp=Math.Min(target.s.hp,target.hp+u.s.attack*u.s.healing);}
     double hit=Growth.Damage(u.s,new UnitStats{hp=800+round*300,defense=20+round*3},enemyHp,tick)*(1+synergy*.12)*(u.r.zone=="back"?.65:1);enemyHp-=hit;
     if(u.s.Has("regeneration"))u.hp=Math.Min(u.s.hp,u.hp+u.s.hp*.02);if(u.s.Has("leech"))u.hp=Math.Min(u.s.hp,u.hp+hit*.15);
    }
    if(enemyHp<=0)break;var targetFront=units.FirstOrDefault(u=>u.r.zone=="front"&&u.hp>0);if(targetFront!=null)targetFront.hp-=Math.Max(1,enemyAttack-targetFront.s.defense)*(targetFront.s.Has("guard")?.92:1);
    if(tick%3==0)log.Insert(0,"行动 "+tick+" · 敌方生命 "+Math.Max(0,Mathx.Round(enemyHp))+" · 前台 "+units.Count(u=>u.r.zone=="front"&&u.hp>0)+" 人");
   }
   bool won=enemyHp<=0;streak=won?streak+1:0;int interest=Math.Min(5,gold/10),income=5+interest+Math.Min(3,streak)+(strategy=="income"?2:0)+(strategy=="reserve"?units.Count(u=>u.r.zone=="back"):0);
   health=Math.Max(0,health-(won?0:5+round));gold+=income;phase=health<=0||round==9?"finished":"result";log.Insert(0,(won?"胜利":"失利")+" · 收入 "+income+"（含利息 "+interest+"）");
  }
  public void Next(){if(phase!="result")return;round++;phase="prepare";if(!locked)Offers();}
 }
 public class DuelFighter {public string id;public Companion character;public int team,hits;public double hp;public UnitStats stats;}
 public class Duel {
  public List<DuelFighter> fighters=new List<DuelFighter>();public int team,round=1,winner=-1;
  public HashSet<string> used=new HashSet<string>();public List<string> log=new List<string>{"玩家一行动：选择角色，再选择目标"};
  public Duel(List<Companion> a,List<Companion> b,Catalog cat,IEnumerable<Weapon> weapons){if(a.Count!=5||b.Count!=5||a.Select(c=>c.id).Distinct().Count()!=5||b.Select(c=>c.id).Distinct().Count()!=5)throw new ArgumentException("双方必须各选择五名不同角色");
   for(int side=0;side<2;side++)foreach(var c in side==0?a:b){var v=Growth.Stats(c,cat,weapons);fighters.Add(new DuelFighter{id=side+":"+c.id,character=c,team=side,hp=v.hp,stats=v});}
  }
  bool Available(int side){return fighters.Any(f=>f.team==side&&f.hp>0&&!used.Contains(f.id));}
  public bool Act(string actorId,string targetId,bool skill){if(winner>=0)return false;var a=fighters.FirstOrDefault(f=>f.id==actorId);var t=fighters.FirstOrDefault(f=>f.id==targetId);
   if(a==null||t==null||a.hp<=0||t.hp<=0||a.team!=team||used.Contains(a.id))return false;bool heal=skill&&a.character.role=="support";if(heal?a.team!=t.team:a.team==t.team)return false;
   a.hits++;int value;if(heal){value=Mathx.Round(a.stats.attack*2*a.stats.healing);t.hp=Math.Min(t.stats.hp,t.hp+value);}else{value=Growth.Damage(a.stats,t.stats,t.hp,a.hits,(skill?1.35:1)*(a.stats.Has("haste")?1.1:1));t.hp=Math.Max(0,t.hp-value);if(a.stats.Has("leech"))a.hp=Math.Min(a.stats.hp,a.hp+Mathx.Round(value*.15));}
   if(a.stats.Has("regeneration"))a.hp=Math.Min(a.stats.hp,a.hp+Mathx.Round(a.stats.hp*.02));used.Add(a.id);int next=1-team;if(!Available(next))next=team;if(!Available(next)){used.Clear();round++;next=round%2==1?0:1;}team=next;
   for(int side=0;side<2;side++)if(!fighters.Any(f=>f.team!=side&&f.hp>0))winner=side;
   log.Insert(0,a.character.name+(heal?"治疗":"攻击")+t.character.name+" · "+value);log=log.Take(8).ToList();return true;
  }
 }
}
