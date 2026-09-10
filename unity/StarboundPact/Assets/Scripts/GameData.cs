using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Starbound {
 [Serializable] public class Companion {
  public string id, name, title, element, role, rarity, accent, biography;
  public int level, power, constellation;
  public string[] skills, quotes;
  public string[] rings = new string[3];
 }
 [Serializable] public class Weapon { public string id, name, rarity, ownerId; public int level, refinement; }
 [Serializable] public class Ring { public string id, name, stat, effect, description; public double value; }
 [Serializable] public class Item { public string name; public int count; }
 [Serializable] public class Reward { public int crystals, gold; public Item[] items, materials; }
 [Serializable] public class Stage { public string id, title, synopsis; public int recommendedPower, staminaCost; public Reward firstClearRewards; }
 [Serializable] public class Chapter { public string title, description; public Stage[] stages; }
 [Serializable] public class Floor { public int floor, recommendedPower; public string title, modifierName, modifierDesc, bossName; public Reward firstClearRewards, sweepRewards; }
 [Serializable] public class Quest { public string id, type, title, desc, description; public int target, targetCount, progress, rewardCrystals, rewardGold, rewardActivity; public bool claimed; public Item rewardItem; public Item[] rewardMaterials; }
 [Serializable] public class Milestone { public int points, rewardCrystals, rewardGold; public Item rewardItem; }
 [Serializable] public class PathStats { public double attack, hp, defense, crit, critDamage, pursuit, dot, vulnerability, reflect, lifesteal; }
 [Serializable] public class CombatPath { public string id, name, strengths, weaknesses; public PathStats stats; }
 [Serializable] public class Catalog {
  public Companion[] companions; public Weapon[] weapons; public Ring[] rings; public Chapter[] chapters; public Floor[] floors; public CombatPath[] paths;
  public Dictionary<string,Milestone[]> milestones;
 }
 [Serializable] public class HomeData { public int comfort, accumulatedStamina, accumulatedGold; public double lastHarvestTimestamp; public List<string> stationedCompanionIds = new List<string>(); }
 [Serializable] public class Pull { public string kind, id, rarity, pool, time; public bool duplicate = true; }
 [Serializable] public class SaveData {
  public int stamina, crystals, gold, pityCharacter, pityLimited, pityWeapon, playerLevel, playerExp, battleSeed, highestTowerFloor, towerFloor;
  public bool limitedGuaranteed;
  public List<Companion> companions; public List<Weapon> weapons; public string[] formation;
  public List<Pull> pullHistory = new List<Pull>();
  public Dictionary<string,int> materials = new Dictionary<string,int>();
  public List<string> completedStages = new List<string>();
  public List<Quest> dailyTasks, weeklyTasks, monthlyTasks, sideQuests;
  public List<int> claimedDailyChests, claimedWeeklyChests, claimedMonthlyChests;
  public int dailyActivity, weeklyActivity, monthlyActivity, currencyWarsHighScore, defenseHighScore, pvpWins;
  public HomeData homestead;
 }
 public static class Mathx {
  public static int Round(double n) { return (int)Math.Floor(n + .5); }
  public static double Clamp(double n,double lo,double hi) { return Math.Max(lo,Math.Min(hi,n)); }
 }
 public class UnitStats {
  public double hp, attack, defense, interval=1, healing=1;
  public HashSet<string> effects=new HashSet<string>();
  public bool Has(string effect) { return effects.Contains(effect); }
  public UnitStats Clone() { return (UnitStats)MemberwiseClone(); }
 }
 public static class Growth {
  static readonly int[] levels={1,10,20,30,40,50};
  public static List<Ring> Rings(Companion c,Catalog cat) {
   var result=cat.rings.Take(6).Where((r,i)=>c.level>=levels[i]).ToList();
   for(int i=0;i<3;i++) { var id=c.rings!=null&&c.rings.Length>i?c.rings[i]:null;
    if(id=="common-"+(i+7)||id=="exclusive-"+(i+7)) result.Add(cat.rings.First(r=>r.id==id)); }
   return result;
  }
  public static UnitStats Stats(Companion c,Catalog cat,IEnumerable<Weapon> weapons=null) {
   var rings=Rings(c,cat); var w=weapons==null?null:weapons.FirstOrDefault(v=>v.ownerId==c.id);
   return new UnitStats { hp=600+c.level*12+rings.Where(r=>r.stat=="生命").Sum(r=>r.value)+(c.role=="guardian"?350:0),
    attack=55+c.level*2+Mathx.Clamp(c.constellation,0,6)*7+rings.Where(r=>r.stat=="攻击").Sum(r=>r.value)+(w==null?0:w.level+w.refinement*5),
    defense=18+rings.Where(r=>r.stat=="防御").Sum(r=>r.value)+(c.role=="guardian"?25:0),
    interval=rings.Any(r=>r.effect=="haste")?.9:1, healing=rings.Any(r=>r.effect=="healing")?1.2:1,
    effects=new HashSet<string>(rings.Select(r=>r.effect)) };
  }
  public static int Damage(UnitStats a,UnitStats d,double hp,int hits,double multiplier=1) {
   double amount=a.attack*multiplier-d.defense*(a.Has("pierce")?.65:1);
   if(a.Has("execute")&&hp<d.hp/2) amount*=1.15;
   if(a.Has("echo")&&hits%3==0) amount*=1.25;
   if(d.Has("guard")) amount*=.92;
   return Math.Max(1,Mathx.Round(amount));
  }
 }
 public class GameSession {
  public readonly Catalog catalog; public SaveData save; public string storagePath; public string notice="";
  readonly string initialJson; readonly Random random=new Random();
  public GameSession(string catalogJson,string initial,string directory) {
   catalog=JsonConvert.DeserializeObject<Catalog>(catalogJson); initialJson=initial;
   storagePath=Path.Combine(directory,"starbound-unity-v1.json");
   save=JsonConvert.DeserializeObject<SaveData>(initial);
   if(File.Exists(storagePath)) {
    try { save=Read(File.ReadAllText(storagePath)); }
    catch(Exception ex) {
     if(File.Exists(storagePath+".bak")) { try {save=Read(File.ReadAllText(storagePath+".bak")); notice="已从备份恢复存档";} catch {notice="存档读取失败："+ex.Message;} }
     else notice="存档读取失败："+ex.Message;
     File.Copy(storagePath,storagePath+".corrupt-"+DateTime.UtcNow.Ticks,false);
    }
   }
  }
  SaveData Read(string json) {
   var token=JObject.Parse(json); var body=token["state"]??token;
   if(body["companions"]==null||body["formation"]==null) throw new InvalidDataException("缺少角色或编队数据");
   var merged=JObject.Parse(initialJson); merged.Merge(body,new JsonMergeSettings{MergeArrayHandling=MergeArrayHandling.Replace,MergeNullValueHandling=MergeNullValueHandling.Ignore});
   var s=merged.ToObject<SaveData>();
   s.companions=catalog.companions.Select(def=> {
    var c=JsonConvert.DeserializeObject<Companion>(JsonConvert.SerializeObject(def)); var old=s.companions.FirstOrDefault(x=>x!=null&&x.id==def.id);
    if(old!=null){c.level=(int)Mathx.Clamp(old.level,1,90);c.constellation=(int)Mathx.Clamp(old.constellation,0,6);c.rings=(old.rings??new string[3]).Concat(new string[3]).Take(3).ToArray();} return c;
   }).ToList();
   var owned=new HashSet<string>(s.companions.Select(c=>c.id)); var used=new HashSet<string>(); int count=0;
   s.formation=(s.formation??new string[9]).Concat(new string[9]).Take(9).Select(id=> id!=null&&owned.Contains(id)&&!used.Contains(id)&&count<5?(used.Add(id)&&++count>0?id:null):null).ToArray();
   s.gold=Math.Max(0,s.gold);s.crystals=Math.Max(0,s.crystals);s.stamina=(int)Mathx.Clamp(s.stamina,0,240);
   s.pityCharacter=(int)Mathx.Clamp(s.pityCharacter,0,79);s.pityLimited=(int)Mathx.Clamp(s.pityLimited,0,79);s.pityWeapon=(int)Mathx.Clamp(s.pityWeapon,0,79);
   s.pullHistory=(s.pullHistory??new List<Pull>()).Take(100).ToList();
   return s;
  }
  public bool Import(string path) {
   try {var loaded=Read(File.ReadAllText(path));save=loaded;Store();notice="网页存档已导入";return true;}
   catch(Exception ex){notice="导入失败："+ex.Message;return false;}
  }
  public void Store() {
   Directory.CreateDirectory(Path.GetDirectoryName(storagePath));
   var tmp=storagePath+".tmp"; File.WriteAllText(tmp,JsonConvert.SerializeObject(new{version=1,state=save},Formatting.Indented));
   if(File.Exists(storagePath)) File.Replace(tmp,storagePath,storagePath+".bak"); else File.Move(tmp,storagePath);
  }
  public Companion Character(string id) {return save.companions.First(c=>c.id==id);}
  public void Level(string id) {var c=Character(id);if(c.level>=90||save.gold<400)return;save.gold-=400;c.level++;Store();}
  public void Equip(string id,string weapon) {
   if(!save.weapons.Any(w=>w.id==weapon))return;
   foreach(var w in save.weapons) {if(w.id==weapon)w.ownerId=id;else if(w.ownerId==id)w.ownerId=null;} Store();
  }
  public void Ring(string id,int slot,bool exclusive) {
   if(slot<0||slot>2||exclusive&&Material("ring:"+id+":"+slot)<1)return;
   var c=Character(id);if(c.rings==null||c.rings.Length!=3)c.rings=new string[3];c.rings[slot]=(exclusive?"exclusive-":"common-")+(slot+7);Store();
  }
  public void PullRing(string id,int slot) {
   if(slot<0||slot>2||save.crystals<160)return;string key="ring:"+id+":"+slot;
   if(Material(key)>0)return;save.crystals-=160;bool won=Material(key+":pity")>=29||random.NextDouble()<.08;
   save.materials[key]=won?1:0;save.materials[key+":pity"]=won?0:Material(key+":pity")+1;notice=won?"获得专属魂环，请装备":"未获得专属魂环，保底进度已累积";Store();
  }
  public int Material(string key) {return save.materials.ContainsKey(key)?save.materials[key]:0;}
  public void AddItems(IEnumerable<Item> items) {if(items==null)return;foreach(var item in items)save.materials[item.name]=Material(item.name)+item.count;}
  public void Grant(Reward r) {save.crystals+=r.crystals;save.gold+=r.gold;AddItems(r.items);AddItems(r.materials);}
  public List<Pull> Summon(string pool,int count) {
   var result=new List<Pull>();if((count!=1&&count!=10)||save.crystals<count*160)return result;
   save.crystals-=count*160;
   int pity=pool=="weapon"?save.pityWeapon:pool=="limited"?save.pityLimited:save.pityCharacter;
   for(int i=0;i<count;i++) {
    bool five=pity>=79||random.NextDouble()<(pool=="weapon"?.02:.016);string rarity=five?"5星":"4星";string id;
    if(pool=="weapon") {var eligible=save.weapons.Where(w=>w.rarity==rarity).ToArray();var w=eligible[random.Next(eligible.Length)];id=w.id;w.refinement=Math.Min(5,w.refinement+1);}
    else {
     Companion c;
     if(five&&pool=="limited") {bool win=save.limitedGuaranteed||random.NextDouble()<.5;save.limitedGuaranteed=!win;
      var eligible=save.companions.Where(v=>v.rarity=="5星"&&v.id!="astra").ToArray();c=win?Character("astra"):eligible[random.Next(eligible.Length)];}
     else {var eligible=save.companions.Where(v=>v.rarity==rarity&&v.id!="astra").ToArray();c=eligible[random.Next(eligible.Length)];}
     id=c.id;c.constellation=Math.Min(6,c.constellation+1);
    }
    pity=five?0:pity+1;var pull=new Pull{kind=pool=="weapon"?"weapon":"companion",id=id,rarity=rarity,pool=pool,time=DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")};result.Add(pull);save.pullHistory.Insert(0,pull);
   }
   if(pool=="weapon")save.pityWeapon=pity;else if(pool=="limited")save.pityLimited=pity;else save.pityCharacter=pity;
   save.pullHistory=save.pullHistory.Take(100).ToList();Store();return result;
  }
  public List<Quest> Tasks(string type) {return type=="daily"?save.dailyTasks:type=="weekly"?save.weeklyTasks:save.monthlyTasks;}
  public int Activity(string type) {return type=="daily"?save.dailyActivity:type=="weekly"?save.weeklyActivity:save.monthlyActivity;}
  public List<int> Chests(string type){return type=="daily"?save.claimedDailyChests:type=="weekly"?save.claimedWeeklyChests:save.claimedMonthlyChests;}
  public void ClaimTask(string type,Quest q) {
   if(q.claimed||q.progress<q.target)return;q.claimed=true;save.crystals+=q.rewardCrystals;save.gold+=q.rewardGold;
   if(q.rewardItem!=null)AddItems(new[]{q.rewardItem});
   if(type=="daily")save.dailyActivity=Math.Min(100,save.dailyActivity+q.rewardActivity);else if(type=="weekly")save.weeklyActivity=Math.Min(150,save.weeklyActivity+q.rewardActivity);else save.monthlyActivity=Math.Min(250,save.monthlyActivity+q.rewardActivity);Store();
  }
  public void ClaimChest(string type,Milestone m) {if(Activity(type)<m.points||Chests(type).Contains(m.points))return;Chests(type).Add(m.points);save.crystals+=m.rewardCrystals;save.gold+=m.rewardGold;if(m.rewardItem!=null)AddItems(new[]{m.rewardItem});Store();}
  public void ClaimQuest(Quest q){if(q.claimed||q.progress<q.targetCount)return;q.claimed=true;save.crystals+=q.rewardCrystals;save.gold+=q.rewardGold;AddItems(q.rewardMaterials);Store();}
  public void Harvest(){var h=save.homestead;double hours=Math.Max(0,(DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()-h.lastHarvestTimestamp)/3600000.0);int n=h.stationedCompanionIds.Count;save.stamina=Math.Min(240,save.stamina+h.accumulatedStamina+(int)Math.Min(120,hours*n*3));save.gold+=h.accumulatedGold+(int)Math.Min(24000,hours*n*300);h.accumulatedStamina=0;h.accumulatedGold=0;h.lastHarvestTimestamp=DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();Store();}
 }
}
