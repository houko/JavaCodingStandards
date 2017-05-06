# 前言
- 如果这份规范中有不合理的地方,欢迎提issue/提PR等各种形式进行完善。
- 如果您有更好的代码风格未在本规范中列出,欢迎提issue/提PR等各种形式进行完善。
- 本规范最后一部分`业务规范`仅根据本人所在公司情况制定（游戏开发）,请酌情考虑使用。
- 本project还在完善和验证中,希望和大家一起写出优雅而实用的代码。


# 一.命名规范
#### 1.【强制】 代码中的命名严禁使用拼音与英文混合的方式，更不允许直接使用中文的方式。
说明：正确的英文拼写和语法可以让阅读者易于理解，避免歧义。注意，即使纯拼音命名方式也要避免采用。    
反例： `DaZhePromotion [打折] / getPingfenByName() [评分] / int 某变量 = 3`   
正例： `alibaba / taobao / youku / hangzhou` 等国际通用的名称，可视同英文。     

---
#### 2. 类名使用 UpperCamelCase 风格（首字母大写），必须遵从驼峰形式。
正例：`MarcoPolo / UserDO / XmlService / TcpUdpDeal / TaPromotion `  
反例：`macroPolo / UserDo / XMLService / TCPUDPDeal / TAPromotion `  

---
#### 3. 方法名、参数名、成员变量、局部变量都统一使用 lowerCamelCase 风格（首字母小写），必须遵从驼峰形式。
正例： `localValue / getHttpMessage() / inputUserId`

---
#### 4. 【强制】常量命名全部大写，单词间用下划线隔开，力求语义表达完整清楚，不要嫌名字长。
正例： `MAX_STOCK_COUNT`    
反例： `MAX_COUNT`    

---
#### 5. 【强制】包名统一使用小写，点分隔符之间有且仅有一个自然语义的英语单词。包名统一使用单数形式，但是类名如果有复数含义，类名可以使用复数形式。
正例： 应用工具类包名为 com.java.open.util、类名为 MessageUtils（此规则参考spring 的框架结构）

---
#### 6. 杜绝完全不规范的缩写，避免望文不知义。
反例： `AbstractClass`“缩写”命名成 `AbsClass`；`condition`“缩写”命名成 `condi`，此类随意缩写严重降低了代码的可阅读性。

---
#### 7. 【推荐】如果使用到了设计模式，建议在类名中体现出具体模式。
说明：将设计模式体现在名字中，有利于阅读者快速理解架构设计思想。
正例：

```
	public class OrderFactory;
	public class LoginProxy;
	public class ResourceObserver;
```
---
#### 8. 枚举类名建议带上 Enum 后缀，枚举成员名称需要全大写，单词间用下划线隔开。
说明：枚举其实就是特殊的常量类，且构造方法被默认强制是私有。   
正例：枚举名字：`DealStatusEnum`，成员名称：`SUCCESS / UNKOWN_REASON`。   

---
#### 9. 【强制】 代码中的命名均不能以下划线或美元符号开始，也不能以下划线或美元符号结束。   
反例：` _name / __name / $Object / name_ / name$ / Object$`

---
#### 10. 【推荐】接口类中的方法和属性不要加任何修饰符号（public 也不要加），保持代码的简洁性，并加上有效的 Javadoc 注释

---
# 二.常量定义
#### 1. 【强制】不允许出现任何魔法值（即未经定义的常量）直接出现在代码中。
反例： 

```
String key = "Id#taobao_"+tradeId；
cache.put(key, value);
```

---
#### 2. 【强制】long 或者 Long 初始赋值时，必须使用大写的 L，不能是小写的 l，小写容易跟数字1 混淆，造成误解。
说明：Long a = 2l; 写的是数字的 21，还是 Long 型的 2?

---
#### 3. 【强制】不要使用一个常量类维护所有常量，应该按常量功能进行归类，分开维护。
如：缓存相关的常量放在类：CacheConsts 下；系统配置相关的常量放在类：ConfigConsts 下。   
说明：大而全的常量类，非得使用查找功能才能定位到修改的常量，不利于理解和维护。   

---
#### 4. 【推荐】常量的复用层次有五层：跨应用共享常量、应用内共享常量、子工程内共享常量、包内共享常量、类内共享常量。

```
1） 跨应用共享常量：放置在二方库中，通常是 client.jar 中的 constant 目录下。   
2） 应用内共享常量：放置在一方库的 modules 中的 constant 目录下。   
反例：易懂变量也要统一定义成应用内共享常量，两位攻城师在两个类中分别定义了表示“是”的变量：   
类 A 中：public static final String YES = "yes";   
类 B 中：public static final String YES = "y";   
A.YES.equals(B.YES)，预期是 true，但实际返回为 false，导致产生线上问题。      
3） 子工程内部共享常量：即在当前子工程的 constant 目录下。    
4） 包内共享常量：即在当前包下单独的 constant 目录下。    
5） 类内共享常量：直接在类内部 private static final 定义。    
```

---
#### 5.【推荐】如果变量值仅在一个范围内变化，且带有名称之外的延伸属性，定义为枚举类。下面
正例中的数字就是延伸信息，表示星期几。
正例：

```
public Enum { 
   MONDAY(1),
   TUESDAY(2),
   WEDNESDAY(3),
   THURSDAY(4), 
   FRIDAY(5), 
   SATURDAY(6),
   SUNDAY(7);
   }
```


# 三. 格式规约

#### 1. 【建议】缩进采用 4 个空格，禁止使用 tab 字符。
说明：如果使用 tab 缩进，必须设置 1 个 tab 为 4 个空格。IDEA 设置 tab 为 4 个空格时，请勿勾选 `Use tab character`；而在 eclipse 中，必须勾选 `insert spaces for tabs`。因为tab很容易造成代码对齐方式错乱,尤其在生成html文档的时候格式会乱掉。

---
#### 2. 【强制】单行字符数限制不超过 120 个，超出需要换行。

---

# 四. OOP规约
#### 1. 【强制】外部正在调用或者二方库依赖的接口，不允许修改方法签名，避免对接口调用方产生影响。接口过时必须加@Deprecated 注解，并清晰地说明采用的新接口或者新服务是什么。

---
#### 2. 【强制】定义 DO/DTO/VO 等 POJO 类时，不要设定任何属性默认值。
反例：POJO 类的 gmtCreate 默认值为 new Date(); , 但是这个属性在数据提取时并没有置入具体值，在更新其它字段时又附带更新了此字段，导致创建时间被修改成当前时间。

#### 3.  【强制】构造方法里面禁止加入任何业务逻辑，如果有初始化逻辑，请放在 init 方法中。

---
#### 4. 【强制】POJO 类必须写 toString 方法。使用 IDE 的中工具：source> generate toString时，如果继承了另一个 POJO 类，注意在前面加一下 super.toString。
说明：在方法执行抛出异常时，可以直接调用 POJO 的 toString()方法打印其属性值，便于排查问题。

---
#### 5. 【推荐】当一个类有多个构造方法，或者多个同名方法，这些方法应该按顺序放置在一起，便于阅读。

---
#### 6.【推荐】 类内方法定义顺序依次是：公有方法或保护方法 > 私有方法 > getter/setter方法。
说明：公有方法是类的调用者和维护者最关心的方法，首屏展示最好；    
保护方法虽然只是子类关心，也可能是“模板设计模式”下的核心方法；    
而私有方法外部一般不需要特别关心，是一个黑盒实现；    
因为方法信息价值较低，所有 Service 和 DAO 的 getter/setter 方法放在类体最后。  

---
#### 7.  【推荐】setter 方法中，参数名称与类成员变量名称一致，this.成员名 = 参数名。在getter/setter 方法中，不要增加业务逻辑，增加排查问题的难度。我曾天真的认为这种黑魔法很酷。
反例：

```
public Integer getData() {
if (true) {
return data + 100;
} else {
return data - 100;
	}
}   
```

---
#### 8. 【推荐】下列情况，声明成 final 会更有提示性：
1） 不需要重新赋值的变量，包括类属性、局部变量。   
2） 对象参数前加 final，表示不允许修改引用的指向。   
3） 类方法确定不允许被重写。  

---
#### 9. 【推荐】类成员与方法访问控制从严：
1） 如果不允许外部直接通过 new 来创建对象，那么构造方法必须是 private。  
2） 工具类不允许有 public 或 default 构造方法。     
3） 类非 static 成员变量并且与子类共享，必须是 protected。    
4） 类非 static 成员变量并且仅在本类使用，必须是 private。     
5） 类 static 成员变量如果仅在本类使用，必须是 private。    
6） 若是 static 成员变量，必须考虑是否为 final。     
7） 类成员方法只供类内部调用，必须是 private。        
8） 类成员方法只对继承类公开，那么限制为 protected。       
说明：任何类、方法、参数、变量，严控访问范围。过于宽泛的访问范围，不利于模块解耦。    

思考：如果是一个 private 的方法，想删除就删除，可是一个 public 的 service 方法，或者一个 public 的成员变量，删除一下，不得手心冒点汗吗？变量像自己的小孩，尽量在自己的视线内，变量作用域太大，如果无限制的到处跑，那么你会担心的。

---
# 四. 集合操作
#### 1. 【强制】不要在 foreach 循环里进行元素的 remove/add 操作。remove 元素请使用 Iterator方式，如果并发操作，需要对 Iterator 对象加锁。
反例：

```
List<String> a = new ArrayList<String>();
a.add("1");
a.add("2");
for (String temp : a) {
	if ("1".equals(temp)) {
		a.remove(temp);
		}
	}
```

正例：

```
Iterator<String> it = a.iterator();
while (it.hasNext()) {
	String temp = it.next();
	if (删除元素的条件) {
	it.remove();
		}
	} 
```

--- 
# 五.异常处理
#### 1.【推荐】方法的返回值可以为 null，不强制返回空集合，或者空对象等，必须添加注释充分说明什么情况下会返回 null 值。调用方需要进行 null 判断防止 NPE 问题。

--- 
#### 2. 【强制】对大段代码进行 try-catch，这是不负责任的表现。catch 时请分清稳定代码和非稳定代码，稳定代码指的是无论如何不会出错的代码。对于非稳定代码的 catch 尽可能进行区分异常类型，再做对应的异常处理。

--- 
#### 3. 【强制】捕获异常是为了处理它，不要捕获了却什么都不处理而抛弃之，如果不想处理它，请将该异常抛给它的调用者。最外层的业务使用者，必须处理异常，将其转化为用户可以理解的内容。

--- 
# 六. 日志
#### 1. 【强制】直接return的情况下一定要打日志,不然根本无法判断代码没有执行还是在哪个位置被return了。

---
#### 2. 【强制】异常信息应该包括两类信息：案发现场信息和异常堆栈信息。如果不处理，那么通过关键字 throws 往上抛出。
正例：logger.error(各类参数或者对象 toString + "_" + e.getMessage(), e);

---
#### 3. 【参考】可以使用 warn 日志级别来记录用户输入参数错误的情况，避免用户投诉时，无所适从。注意日志输出的级别，error 级别只记录系统逻辑出错、异常等重要的错误信息。如非必要，请不要在此场景打出 error 级别。


---
备注: 以上内容摘自<[阿里巴巴JAVA编程规范](阿里巴巴java编程规范2017版.pdf)>

---
# 7. 业务规范

#### 1. 【强制】写业务逻辑时,一定要把对应的需求链接贴在代码注释里,方便在和策划撕逼时方便决定谁该背锅。

```
    // 月卡增幅 2017/01/04 http://192.168.1.88:8010/index.php?m=story&f=view&storyID=7775
    if ((instanceConfig.getInstanceType() & 1) == 1) { // 个人BOSS
        itemNum += extraAdd;
    }
    if (itemConfig.getCarrymax() > 0) {
        int count = BagApiNew.getItemCount(bag, itemId) + StorageApi.getItemCount(rid, itemId);
        if (count + itemNum >= itemConfig.getCarrymax()) {// 超出最大囤积上限的时候获得一部分
            LOGGER.error("{}|{}|玩家领取副本【{}】奖励【itemId:{},itemNum:{},oldNum:{}】时超出上限【{}】", rid, role.get("name"), instanceConfig.getMapid(), itemId, itemNum, count, itemConfig.getCarrymax());
            itemNum = itemConfig.getCarrymax() - count;
        }
    }
```

---
#### 2. 【强制】不要和策划口头定需求，有修改或者新增在需求里体现出来。

---
#### 3. 【强制】需求做完要自己先测试，未测出bug再打给策划。然后再和策划一起做最后bug排查和功能优化。严禁未经任何自查就扔给策划,除百你对改动的代码100%确认没有问题。

---
#### 4. 【强制】方法体一定要有注释并署名，方便找写该业务的人做BUG排查。


```
    /**
     * 请求打开困惑殿堂面板
     *
     * @param rid rid
     * author: 小莫
     * date: 2017-05-04 10:08
     */
    public void reqOpenPanel(int rid) {
    	// code
    }
```

--- 
#### 5. 【强制】方法体中决定不能出现数字(0除外)，放在常量类中并加以注释。如果常量小于3个可以放在本类的顶部（参考常量定义-3）

```
package rpg.system.task.constant;

public interface TaskType {

    int JIFENGFUMO = 4;
    int CAIJI = 5;
    int XIANGYAOFUMO = 8;
    int BIG_BOSS = 10; //精英任务
    int QIYUXUNHUAN = 11;
    int JINDU = 12;
    int TIAOZHAN = 13;
    int TREASURE_BOWL = 14;// 聚宝盆
    int QIYUSUIJI = 23;
    int CANGYUE_ISLAND = 100;
}

```

--- 
#### 6. 【强制】类型和Map的key要定义常量类存放于业务模块。

正例：`uparm`模块 `constant`包中存放,以 `XxxConst`,`XxxField`命名。

```
├── uparm
│   ├── UparmManager.java
│   ├── bean
│   │   ├── ComposeBean.java
│   │   └── XilianBean.java
│   ├── constant
│   │   └── ArmFromConst.java
│   ├── handler
│   │   ├── ReqAddQhFailNumHandler.java
│   │   ├── ReqDecomposeHandler.java
│   │   ├── ReqDoHandler.java
│   │   ├── ReqDoSzHandler.java
│   │   ├── ReqDoThreeHandler.java
│   │   ├── ReqDoTowHandler.java
│   │   ├── ReqFuMoHandler.java
│   │   ├── ReqFuMoqcHandler.java
│   │   ├── ReqHuanSeHandler.java
│   │   ├── ReqItemQianghuaHandler.java
│   │   ├── ReqKaiqiHandler.java
│   │   ├── ReqQhResetHandler.java
│   │   ├── ReqQiangHuaHandler.java
│   │   ├── ReqQiangHuaInitHandler.java
│   │   ├── ReqSaveXilianHandler.java
│   │   ├── ReqTupoHandler.java
│   │   ├── ReqXilianHandler.java
│   │   ├── ReqYiJianComposeHandler.java
│   │   ├── ReqYiJianQiangHuaHandler.java
│   │   ├── ReqZSHandler.java
│   │   ├── ReqZSsbuzupcHandler.java
│   │   ├── ReqZyfmHandler.java
│   │   └── ReqZyqhHandler.java

```


`Field`内容例如:

```
public interface LimitTimeTaskField {
    /**
     * 任务接受状态
     */
    int TASK_ACCEPT_STATE = 1;

    /**
     * 任务完成状态
     */
    int TASK_COMPLETE_STATE = 2;

    /**
     * 限时任务消息
     */
    String LIMIT_TIME_TASK_INFO = "LIMIT_TIME_TASK_INFO";

    /**
     * 分组id
     */
    String LIMIT_TIME_TASK_GROUP_ID ="LIMIT_TIME_TASK_GROUP_ID";
    }
```