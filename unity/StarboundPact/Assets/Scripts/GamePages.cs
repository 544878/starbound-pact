using System;
using System.Linq;
using System.Collections.Generic;
using UnityEngine;

namespace Starbound {
 public partial class StarboundGame {
  bool activityClaimed;int chapter;
  void Activities(){string[] modes={"defense","currency","duel"},names={"星光守卫战","货币战争","双人对决"};for(int i=0;i<3;i++)if(Btn(names[i],43+i*270,178,250,52,true,activity==modes[i])){activity=modes[i];message="";}
   if(activity=="defense")DefensePage();else if(activity=="currency")WarPage();else DuelPage();
  }
  void DefensePage(){Text("基地 "+defense.health+" / 10     部署费用 "+(int)defense.dp+"     波次 "+defense.wave+" / 5     击败 "+defense.kills,45,246,1170,50,23,accent);
   if(Btn(paused?"继续":"暂停",1190,242,110))paused=!paused;if(Btn(speed+"×",1310,242,90))speed=speed==1?2:1;if(Btn("重新布防",1410,242,145)){defense=new Defense();paused=false;activityClaimed=false;}
   GUI.DrawTexture(new Rect(43,305,960,440),garden,ScaleMode.ScaleAndCrop);Fill(new Rect(43,305,960,440),new Color(.02f,.04f,.06f,.4f));
   for(int y=0;y<5;y++)for(int x=0;x<9;x++){float px=65+x*101,py=327+y*76;var o=defense.operators.FirstOrDefault(v=>v.x==x&&v.y==y);bool ground=Defense.Ground(x,y);
    Fill(new Rect(px,py,93,69),ground?new Color(.68f,.55f,.33f,.6f):new Color(.19f,.38f,.39f,.60f));
    if(o!=null){Text(Name(o.id),px+4,py+4,87,30,18);Bar(px+5,py+53,81,5,o.hp,o.stats.hp,new Color(.3f,.9f,.6f));}
    else Text(x==0&&y==2?"入口":x==8&&y==3?"基地":ground?"路径":"高台",px+10,py+15,80,30,16,muted);
    if(GUI.Button(new Rect(px,py,93,69),"",GUIStyle.none)){if(o!=null)selected=o.id;else if(!defense.Deploy(game.Character(selected),x,y,direction,C,S.weapons))message="无法部署：检查费用、地形、入口/基地和再部署冷却";else message="已部署 "+Name(selected);}
   }
   foreach(var e in defense.enemies){var p=Defense.Position(e);float x=65+(float)p[0]*101,y=327+(float)p[1]*76;Fill(new Rect(x+30,y+17,28,29),new Color(.86f,.31f,.34f));Bar(x+18,y+4,58,5,e.hp,e.maxHp,new Color(.95f,.46f,.43f));}
   Panel(1026,307,529,433);Text(Name(selected)+" · "+Role(game.Character(selected).role),1047,327,488,48,26,accent);Text("部署费用 "+Defense.Cost(game.Character(selected))+"\n守护 / 强攻部署在路径，其余角色部署在高台。",1047,389,476,82,20);string[] dirs={"向右","向下","向左","向上"};for(int i=0;i<4;i++)if(Btn(dirs[i],1046+i*123,489,112,45,true,direction==i))direction=i;
   var op=defense.operators.FirstOrDefault(o=>o.id==selected);if(Btn(op==null?"技能":op.cooldown>0?"冷却 "+Math.Ceiling(op.cooldown)+" 秒":"主动技能",1046,555,233,55,op!=null&&op.cooldown<=0&&defense.phase=="running"))defense.Skill(selected);if(Btn("撤退返费",1300,555,233,55,op!=null))defense.Retreat(selected);
   if(defense.phase=="prepare"||defense.phase=="between"){if(Btn("开始第 "+defense.wave+" 波",1046,641,487,60)){defense.Start();paused=false;}}
   else if(defense.phase=="won"||defense.phase=="lost"){if(Btn((defense.phase=="won"?"守卫成功":"守卫失败")+" · "+(activityClaimed?"已结算":"结算"),1046,641,487,60,!activityClaimed)){int score=defense.kills*20+defense.health*50;S.defenseHighScore=Math.Max(S.defenseHighScore,score);S.crystals+=Math.Min(200,score/10);game.Store();activityClaimed=true;message="守卫战成绩已记录";}}
   else Text("敌军进攻中 · 可随时部署或撤退",1046,660,487,45,21);
   for(int i=0;i<S.companions.Count;i++){var c=S.companions[i];double cd=defense.redeploy.ContainsKey(c.id)?defense.redeploy[c.id]:0;if(Btn(c.name+"  "+Defense.Cost(c)+(cd>0?"（"+Math.Ceiling(cd)+"s）":""),44+i*216,756,202,56,true,selected==c.id))selected=c.id;}
  }
  void WarPage(){Text("节点 "+war.round+" / 9     生命 "+war.health+"     金币 "+war.gold+"     团队上限 "+war.level,43,248,1090,42,24,accent);if(Btn("重新开局",1367,244,185)){war=new War(C);activityClaimed=false;}
   for(int i=0;i<5;i++){var id=war.shop[i];if(Btn(id==null?"已招募":Name(id)+"\n"+war.Cost(id)+" 金币",45+i*215,310,202,79,id!=null&&war.phase=="prepare"&&war.gold>=war.Cost(id)))war.Buy(i);}
   if(Btn("刷新 2",1138,310,185,50,war.gold>=2&&war.phase=="prepare"))war.Refresh();if(Btn(war.locked?"已锁店":"锁定商店",1340,310,205,50,war.phase=="prepare",war.locked))war.locked=!war.locked;
   if(Btn("扩容 4",1138,374,185,50,war.gold>=4&&war.level<8&&war.phase=="prepare"))war.Upgrade();string[] strategies={"income","assault","reserve"},names={"稳健收益","强攻投资","后台储备"};for(int i=0;i<3;i++)if(Btn(names[i],48+i*208,408,195,47,war.phase=="prepare",war.strategy==strategies[i]))war.strategy=strategies[i];
   Text("职业羁绊："+string.Join(" / ",war.Bonds().Select(b=>Role(b.Key)+" "+b.Value+(b.Value>=2?" ✓":""))),704,413,800,44,20,accent);
   scroll=GUI.BeginScrollView(new Rect(45,481,1000,304),scroll,new Rect(0,0,972,Math.Max(296,war.roster.Count*57)));
   for(int i=0;i<war.roster.Count;i++){var u=war.roster[i];float y=i*57;Text(Name(u.id)+"  "+u.rank+"阶",8,y+10,225,40,20);if(Btn("前台",245,y,145,47,war.phase=="prepare",u.zone=="front"))war.Move(u,"front");if(Btn("后台",407,y,145,47,war.phase=="prepare",u.zone=="back"))war.Move(u,"back");if(Btn("候补",569,y,145,47,war.phase=="prepare",u.zone=="bench"))war.Move(u,"bench");if(Btn("出售",738,y,145,47,war.phase=="prepare")){war.Sell(u);break;}}
   GUI.EndScrollView();Panel(1080,485,472,300);Text(string.Join("\n",war.log.Take(5)),1100,500,430,210,18);
   if(war.phase=="prepare"){if(Btn("进入自动战斗",1100,718,430,54,war.roster.Any(u=>u.zone=="front")))war.Fight(S.companions);}
   else if(war.phase=="result"){if(Btn("下一节点",1100,718,430,54))war.Next();}
   else if(Btn(activityClaimed?"已记录成绩":"结束并领取奖励",1100,718,430,54,!activityClaimed)){int score=war.round*1000+war.gold*100+war.health*500;S.currencyWarsHighScore=Math.Max(S.currencyWarsHighScore,score);S.crystals+=score>100000?Math.Min(300,score/1000):50;game.Store();activityClaimed=true;}
  }
  void DuelPage(){if(duel==null){Text("同机双人 · 双方各选五名不重复角色，双方可选相同角色",47,253,1480,54,24,accent);
    for(int t=0;t<2;t++){Text("玩家 "+(t+1)+"  ·  "+duelPicks[t].Count+" / 5",52,338+t*183,1450,50,26);for(int i=0;i<S.companions.Count;i++){var c=S.companions[i];if(Btn(c.name,52+i*215,401+t*183,200,64,true,duelPicks[t].Contains(c.id))){if(duelPicks[t].Contains(c.id))duelPicks[t].Remove(c.id);else if(duelPicks[t].Count<5)duelPicks[t].Add(c.id);}}}
    if(Btn("开始对决",580,704,460,63,duelPicks.All(p=>p.Count==5))){duel=new Duel(duelPicks[0].Select(game.Character).ToList(),duelPicks[1].Select(game.Character).ToList(),C,S.weapons);duelActor=null;activityClaimed=false;}
   }else {Text(duel.winner>=0?"玩家 "+(duel.winner+1)+" 获胜":"第 "+duel.round+" 回合 · 玩家 "+(duel.team+1)+" 行动",48,250,1100,50,27,accent);if(Btn(duelSkill?"技能 / 治疗":"普通攻击",1210,246,340,52))duelSkill=!duelSkill;
    foreach(var f in duel.fighters){int i=duel.fighters.IndexOf(f)%5;float x=50+i*305,y=335+f.team*205;Panel(x,y,285,175);Text(f.character.name+(duel.used.Contains(f.id)?" · 已行动":""),x+12,y+10,265,40,23);Bar(x+12,y+59,259,8,f.hp,f.stats.hp,new Color(.4f,.75f,.64f));Text(Mathx.Round(f.hp)+" / "+f.stats.hp,x+12,y+80,259,35,19);bool canAct=f.team==duel.team&&!duel.used.Contains(f.id);
     if(Btn(duelActor==f.id?"已选行动者":canAct?"选择 / 作为目标":"作为目标",x+12,y+117,259,45,f.hp>0&&duel.winner<0,duelActor==f.id)){
      var actor=duel.fighters.FirstOrDefault(a=>a.id==duelActor);bool healing=duelSkill&&actor!=null&&actor.character.role=="support";
      if(actor!=null&&(healing?f.team==actor.team:f.team!=actor.team)){if(duel.Act(duelActor,f.id,duelSkill))duelActor=null;}
      else if(canAct)duelActor=f.id;
     }
    }
    Text(duel.log.FirstOrDefault(),55,755,1070,50,21,muted);if(duel.winner>=0&&Btn("领取奖励并重新选人",1122,753,430,54)){if(!activityClaimed){S.pvpWins++;S.gold+=500;game.Store();activityClaimed=true;}duel=null;duelPicks=new[]{new List<string>(),new List<string>()};}
   }
  }
  void TasksPage(){Title("旅途委托","完成目标后领取奖励，累积活跃度解锁宝箱。");string[] types={"daily","weekly","monthly"},names={"每日","每周","每月"};for(int i=0;i<3;i++)if(Btn(names[i],45+i*211,299,195,48,true,taskType==types[i]))taskType=types[i];Text("活跃度 "+game.Activity(taskType),760,302,700,45,25,accent);
   var tasks=game.Tasks(taskType);for(int i=0;i<tasks.Count;i++){var q=tasks[i];float y=367+i*72;Panel(45,y,1506,64);Text(q.title,62,y+12,370,43,22);Text(q.desc,443,y+12,615,42,18,muted);Text(q.progress+" / "+q.target,1090,y+12,174,42,20);if(Btn(q.claimed?"已领取":"领取",1310,y+8,220,47,!q.claimed&&q.progress>=q.target))game.ClaimTask(taskType,q);}
   for(int i=0;i<C.milestones[taskType].Length;i++){var m=C.milestones[taskType][i];if(Btn(m.points+" 活跃宝箱"+(game.Chests(taskType).Contains(m.points)?" ✓":""),45+i*303,752,285,55,!game.Chests(taskType).Contains(m.points)&&game.Activity(taskType)>=m.points))game.ClaimChest(taskType,m);}
  }
  void StoryPage(){Title("风语篇章","已完成的主线关卡保留进度；战斗胜利后领取首通奖励。");for(int i=0;i<C.chapters.Length;i++)if(Btn("第 "+(i+1)+" 章",45+i*225,295,210,48,true,chapter==i))chapter=i;var c=C.chapters[chapter];Text(c.title,48,360,1480,48,27,accent);
   scroll=GUI.BeginScrollView(new Rect(45,420,1510,378),scroll,new Rect(0,0,1478,c.stages.Length*109+S.sideQuests.Count*92+65));int row=0;
   foreach(var s in c.stages){float y=row++*109;Text(s.id+" · "+s.title,12,y,1040,43,23);Text(s.synopsis,12,y+43,1050,52,19,muted);bool done=S.completedStages.Contains(s.id);if(Btn(done?"已完成":"挑战 · "+s.staminaCost+" 体力",1150,y+10,310,55,!done))StartBattle("story",s.id);}
   float qy=row*109+15;Text("支线委托",12,qy,1430,45,26,accent);int qi=0;foreach(var q in S.sideQuests){float y=qy+60+qi++*92;Text(q.title+"  "+q.progress+" / "+q.targetCount,12,y,1060,47,21);if(Btn(q.claimed?"已领取":"领取委托奖励",1150,y,310,51,!q.claimed&&q.progress>=q.targetCount))game.ClaimQuest(q);}
   GUI.EndScrollView();
  }
  void TowerPage(){Title("风语深塔","已通关 "+S.highestTowerFloor+" 层 · 首通获得星晶与材料，已通过的楼层可扫荡。");scroll=GUI.BeginScrollView(new Rect(45,300,1510,510),scroll,new Rect(0,0,1478,C.floors.Length*101));foreach(var f in C.floors){float y=(f.floor-1)*101;Text(f.floor+" 层 · "+f.title,12,y+7,560,39,25);Text(f.bossName,590,y+9,455,39,21,muted);Text(f.modifierDesc,12,y+49,1040,42,18,muted);if(Btn("挑战",1060,y+15,190,52,f.floor<=S.highestTowerFloor+1))StartBattle("tower",null,f.floor);if(Btn("扫荡",1270,y+15,190,52,f.floor<=S.highestTowerFloor)){game.Grant(f.sweepRewards);game.Store();message="已领取扫荡物资";}}GUI.EndScrollView();}
  void Inventory(){Title("物资背包","战斗、任务和家园所得物资。");int i=0;foreach(var m in S.materials.Where(m=>!m.Key.StartsWith("ring:")&&m.Value>0)){float x=48+i%3*506,y=320+i/3*130;Panel(x,y,475,104);Text(m.Key,x+20,y+17,435,40,25,accent);Text("持有  "+m.Value,x+20,y+61,435,36,22);i++;}Text("历史成绩：货币战争 "+S.currencyWarsHighScore+"  ·  守卫战 "+S.defenseHighScore+"  ·  双人对决 "+S.pvpWins+" 胜",48,747,1480,60,21,muted);}
  void Homestead(){Title("花庭小憩","最多驻守四名同伴，按驻守时长产出金币与体力。每位每小时 300 金币、3 体力。");var h=S.homestead;Text("舒适度 "+h.comfort+"  ·  驻守 "+h.stationedCompanionIds.Count+" / 4",50,307,1430,55,27,accent);for(int i=0;i<S.companions.Count;i++){var c=S.companions[i];float x=48+i*215;Portrait(c.id,x,395,180,300);if(Btn(c.name+(h.stationedCompanionIds.Contains(c.id)?" · 驻守":""),x,710,180,50,true,h.stationedCompanionIds.Contains(c.id))){if(h.stationedCompanionIds.Contains(c.id)||h.stationedCompanionIds.Count<4){game.Harvest();if(h.stationedCompanionIds.Contains(c.id))h.stationedCompanionIds.Remove(c.id);else h.stationedCompanionIds.Add(c.id);h.comfort=300+h.stationedCompanionIds.Count*110;game.Store();}}}if(Btn("收取家园产出",1120,305,400,56)){game.Harvest();message="家园物资已收取";}}
 }
}
