/* ../libs/nanoblocks.js begin */
/**
 *
 * warning!
 * achtung!
 * увага!
 * внимание!
 *
 * Это автоматически сгенеренный файл. Не редактируйте его самостоятельно.
 *
 */
//  nanoblocks
//  ==========

var nb = {};

// Простите, но в ИЕ такого нет
if (!Array.prototype.indexOf)
{
  Array.prototype.indexOf = function(elt /*, from*/)
  {
    var len = this.length;

    var from = Number(arguments[1]) || 0;
    from = (from < 0)
         ? Math.ceil(from)
         : Math.floor(from);
    if (from < 0)
      from += len;

    for (; from < len; from++)
    {
      if (from in this &&
          this[from] === elt)
        return from;
    }
    return -1;
  };
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  Минимальный common.js
//  ---------------------

//  Наследование:
//
//      function Foo() {}
//      Foo.prototype.foo = function() {
//          console.log('foo');
//      };
//
//      function Bar() {}
//      nb.inherit(Bar, Foo);
//
//      var bar = Bar();
//      bar.foo();
//
nb.inherit = function(child, parent) {
    var F = function() {};
    F.prototype = parent.prototype;
    child.prototype = new F();
    child.prototype.constructor = child;
};

//  Расширение объекта свойствами другого объекта(ов):
//
//      var foo = { foo: 42 };
//      nb.extend( foo, { bar: 24 }, { boo: 66 } );
//
nb.extend = function(dest) {
    var srcs = [].slice.call(arguments, 1);

    for (var i = 0, l = srcs.length; i < l; i++) {
        var src = srcs[i];
        for (var key in src) {
            dest[key] = src[key];
        }
    }

    return dest;
};

//  nb.node
//  -------

nb.node = {};

(function() {

//  ---------------------------------------------------------------------------------------------------------------  //

nb.node.data = function(node, key, value) {
    //  Возвращаем или меняем data-атрибут.
    if (key) {
        if (value !== undefined) {
            node.setAttribute('data-nb-' + key, value);
        } else {
            return parseValue( node.getAttribute('data-nb-' + key) || '' );
        }
    } else {
        //  Возвращаем все data-атрибуты.
        var data = {};

        var attrs = node.attributes;
        var r;
        for (var i = 0, l = attrs.length; i < l; i++) {
            var attr = attrs[i];
            if (( r = /^data-nb-(.+)/.exec(attr.name) )) {
                data[ r[1] ] = parseValue(attr.value);
            }
        }

        return data;
    }

    function parseValue(value) {
        var ch = value.charAt(0);
        return (ch === '[' || ch === '{') ? eval( '(' + value + ')' ) : value;
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Работа с модификаторами.

//  Получить модификатор.
nb.node.getMod = function(node, name) {
    return nb.node.setMod(node, name);
};

var modCache = {};

//  Установить/получить/удалить модификатор.
nb.node.setMod = function(node, name, value) {
    //  Например, name равно popup_to. В bem-терминах это значит, что имя блока popup, а модификатора to.
    //  Ищем строки вида popup_to_left и popup_to (в этом случае, значение модификатора -- true).
    var rx = modCache[name] || (( modCache[name] = RegExp('(?:^|\\s+)' + name + '(?:_([\\w-]+))?(?:$|\\s+)') ));

    var className = node.className;

    if (value === undefined) {
        //  Получаем модификатор.

        var r = rx.exec(className);
        //  Если !r (т.е. r === null), значит модификатора нет вообще, возвращаем '' (FIXME: или нужно возвращать null?).
        //  Если r[1] === undefined, это значит модификатор со значением true.
        return (r) ? ( (r[1] === undefined) ? true : r[1] ) : '';

    } else {
        //  Удаляем старый модификатор, если он там был.
        className = className.replace(rx, ' ').replace(/(^\s+|\s+$)/g, '');

        //  Тут недостаточно просто if (value) { ... },
        //  потому что value может быть нулем.
        if (value !== false && value !== '') {
            //  Устанавливаем новое значение.
            //  При этом, если значение true, то просто не добавляем часть после _.
            className += ' ' + name + ( (value === true) ? '' : '_' + value );
        }
        node.className = className;

    }
};

//  Удалить модификатор.
nb.node.delMod = function(node, name) {
    nb.node.setMod(node, name, false);
};

//  ---------------------------------------------------------------------------------------------------------------  //

})();

(function() {

//  ---------------------------------------------------------------------------------------------------------------  //

//  Информация про все объявленные блоки.
var _factories = {};

//  Список всех уже повешенных на document событий.
var _docEvents = {};

//  Список всех поддерживаемых DOM-событий.
var _domEvents = [
    'click',
    'dblclick',
    'mouseup',
    'mousedown',
    'keydown',
    'keypress',
    'keyup',
    'change',
    /*
        FIXME: Сейчас эти события называются mouseover и mouseout.
        'mouseenter',
        'mouseleave',
    */
    'mouseover',
    'mouseout',
    'focusin',
    'focusout'
];

//  Regexp для строк вида 'click', 'click .foo'.
var _rx_domEvents = new RegExp( '^(' + _domEvents.join('|') + ')\\b\\s*(.*)?$' );

//  Автоинкрементный id для блоков, у которых нет атрибута id.
var _id = 0;
//  Кэш проинициализированных блоков.
var _cache = {};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Block
//  --------

//  Базовый класс для блоков. В явном виде не используется.
//  Все реальные блоки наследуются от него при помощи функции nb.define.

var Block = function() {};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Публичные методы и свойства блоков
//  ----------------------------------

//  Публичные свойства:
//
//    * name -- имя блока.
//    * node -- html-нода, на которой был проинициализирован блок.

//  Публичные методы у Block:
//
//    * on, off, trigger        -- методы для работы с событиями (кастомными и DOM).
//    * data                    -- получает/меняет/удаляет data-nb-атрибуты блока.
//    * show, hide              -- показывает/прячет блок.
//    * getMod, setMod, delMod  -- методы для работы с модификаторами.

//  ---------------------------------------------------------------------------------------------------------------  //

//  Сам конструктор пустой для удобства наследования,
//  поэтому вся реальная инициализация тут.
Block.prototype.__init = function(node) {
    //  Нода блока.
    this.node = node;

    //  Обработчики кастомных событий.
    this.__handlers = {};

    //  Развешиваем обработчики кастомных событий.
    this.__bindEvents();

    //  Возможность что-то сделать сразу после инициализации.
    this.trigger('init');

    //  Отправляем в "космос" сообщение, что блок проинициализирован.
    //  Проверка space нужна для того, чтобы при создании самого space не происходило ошибки.
    //  FIXME: Сделать поддержку специального атрибута, например, data-nb-inited-key, который, если есть,
    //  используется вместо id. Нужно для нескольких одинаковых блоков (у которых id, очевидно, разные).
    if (space) {
        nb.trigger('inited:' + this.id, this);
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Вешаем кастомные (не DOM) события на экземпляр блока.
Block.prototype.__bindEvents = function() {
    var that = this;

    //  Информация про события блока лежат в его factory.
    var mixinEvents = Factory.get(this.name).events;

    //  Вешаем события для каждого миксина отдельно.
    for (var i = 0, l = mixinEvents.length; i < l; i++) {
        var events = mixinEvents[i].custom;

        for (var event in events) {
            (function(handlers) {
                that.__bindCustomEvent(event, function(e, params) {

                    //  Перебираем обработчики справа налево: самый правый это обработчик самого блока,
                    //  затем родительский и т.д.
                    for (var i = handlers.length; i--; ) {
                        var r = handlers[i].call(that, e, params);
                        //  false означает, что нужно прекратить обработку и не баблиться дальше,
                        //  а null -- что просто прекратить обработку (т.е. не вызывать унаследованные обработчики).
                        if (r === false || r === null) { return r; }
                    }
                });
            })( events[event] );
        }
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Работа с событиями
//  ------------------

//  Каждый блок реализует простейший pub/sub + возможность вешать DOM-события.

//  Возвращает список обработчиков события name.
//  Если еще ни одного обработчика не забинжено, возвращает (и сохраняет) пустой список.
Block.prototype.__getHandlers = function(name) {
    var handlers = this.__handlers;

    return handlers[name] || (( handlers[name] = [] ));
};

//  Подписываем обработчик handler на событие name.
//  При этом name может быть вида:
//
//    * 'click'         -- обычное DOM-событие.
//    * 'click .foo'    -- DOM-событие с уточняющим селектором.
//    * 'init'          -- кастомное событие.
//
//  DOM-события вешаются на ноду блока.
//  Помимо этого, есть еще возможность подписаться на DOM-события,
//  повешенные на document (см. nb.define).
//
Block.prototype.on = function(name, handler) {
    var r = _rx_domEvents.exec(name);
    if (r) {
        //  DOM-событие.

        //  В r[1] тип события (например, click), в r[2] необязательный селекторо.
        $(this.node).on( r[1], r[2] || '', handler );
    } else {
        //  Кастомное событие.

        this.__bindCustomEvent(name, handler);
    }

    return handler;
};

Block.prototype.__bindCustomEvent = function(name, handler) {
    this.__getHandlers(name).push(handler);
};

//  Отписываем обработчик handler от события name.
//  Если не передать handler, то удалятся вообще все обработчики события name.
//  Типы событий такие же, как и в on().
Block.prototype.off = function(name, handler) {
    var r = _rx_domEvents.exec(name);
    if (r) {
        //  DOM-событие.

        $(this.node).off( r[1], r[2] || '', handler );
    } else {
        //  Кастомное событие.

        if (handler) {
            var handlers = this.__getHandlers(name);
            //  Ищем этот хэндлер среди уже забинженных обработчиков этого события.
            var i = handlers.indexOf(handler);

            //  Нашли и удаляем этот обработчик.
            if (i !== -1) {
                handlers.splice(i, 1);
            }
        } else {
            //  Удаляем всех обработчиков этого события.
            this.__handlers[name] = null;
        }
    }
};

//  "Генерим" кастомное событие name.
//  Т.е. вызываем по очереди (в порядке подписки) все обработчики события name.
//  В каждый передаем name и params.
Block.prototype.trigger = function(name, params) {
    //  Копируем список хэндлеров. Если вдруг внутри какого-то обработчика будет вызван off(),
    //  то мы не потеряем вызов следующего обработчика.
    var handlers = this.__getHandlers(name).slice();

    for (var i = 0, l = handlers.length; i < l; i++) {
        //  Вызываем обработчик в контексте this.
        handlers[i].call(this, name, params);
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Метод возвращает или устанавливает значение data-атрибута блока.
//  Блок имеет доступ (через этот метод) только к data-атрибутам с префиксом nb-.
//  Как следствие, атрибут data-nb недоступен -- он определяет тип блока
//  и менять его не рекомендуется в любом случае.
//
//  Если вызвать метод без аргументов, то он вернет объект со всеми data-атрибутами.
//
Block.prototype.data = function(key, value) {
    return nb.node.data(this.node, key, value);
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Показываем блок.
Block.prototype.show = function() {
    $(this.node).removeClass('_hidden');
    this.trigger('show');
};

//  Прячем блок.
Block.prototype.hide = function() {
    $(this.node).addClass('_hidden');
    this.trigger('hide');
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Работа с модификаторами
//  -----------------------

//  Получить модификатор.
Block.prototype.getMod = function(name) {
    return nb.node.setMod(this.node, name);
};

//  Установить модификатор.
Block.prototype.setMod = function(name, value) {
    nb.node.setMod(this.node, name, value);
};

//  Удалить модификатор.
Block.prototype.delMod = function(name) {
    nb.node.setMod(this.node, name, false);
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Возвращает массив блоков, находящихся внутри блока.
//  Вариант для применения:
//
//      block.children.forEach(function(block) {
//          block.trigger('init');
//      });
//
Block.prototype.children = function() {
    var children = [];

    //  Ищем все ноды с атрибутом data-nb. Это потенциальные блоки.
    var $nodes = $(this.node).find('[data-nb]');
    for (var i = 0, l = $nodes.length; i < l; i++) {
        //  Пробуем создать блок.
        var block = nb.block( $nodes[i] );
        if (block) {
            children.push(block);
        }
    }

    return children;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Factory
//  -------

//  Для каждого типа блока ( == вызова nb.define) создается специальный объект,
//  который хранит в себе информацию про конструктор и события, на которые подписывается блок.
//  Кроме того, factory умеет создавать экземпляры нужных блоков.

//  Конструктор.
var Factory = function(name, ctor, events) {
    this.name = name;

    ctor.prototype.name = name;
    this.ctor = ctor;

    //  В нормальной ситуации events это объект, который необходимо еще дополнительно
    //  обработать, вызвав _prepareEvents.
    //  но при создании микс-класса, в качестве events будет передан массив с уже готовыми объектами.
    this.events = (events instanceof Array) ? events : this._prepareEvents(events);
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Делим события на DOM и кастомные и создаем объект this.events,
//  в котором хранится информация про события и их обработчики,
//  с примерно такой структурой:
//
//      //  Каждый элемент массива соответствует одному миксину.
//      //  В случае простых блоков в массиве будет ровно один элемент.
//      [
//          {
//              //  DOM-события.
//              dom: {
//                  //  Тип DOM-события.
//                  click: {
//                      //  Селектор DOM-события (может быть пустой строкой).
//                      '': [
//                          //  Этот массив -- это обработчики для блока и его предков.
//                          //  Для "простых" блоков (без наследования), в массиве всегда один хэндлер.
//                          handler1,
//                          handler2,
//                          ...
//                      ],
//                      '.foo': [ handler3 ],
//                      ...
//                  },
//                  ...
//              },
//              //  Кастомные события.
//              custom: {
//                  'open': [ handler4, handler5 ],
//                  ...
//              }
//          }
//      ]
//
//  В общем есть два типа комбинирования классов:
//
//    * Миксины. Каждый миксин добавляет один объект во внешний массив.
//    * Расширение. Каждое расширение добавляет обработчики во внешние массивы.
//
Factory.prototype._prepareEvents = function(events) {
    events = events || {};

    var proto = this.ctor.prototype;

    //  Делим события на DOM и кастомные.
    var dom = {};
    var custom = {};

    for (var event in events) {
        //  Матчим строки вида 'click' или 'click .foo'.
        var r = _rx_domEvents.exec(event);
        var handlers, key;
        if (r) {
            //  Тип DOM-события, например, click.
            var type = r[1];

            handlers = dom[type] || (( dom[type] = {} ));
            //  Селектор.
            key = r[2] || '';

        } else {
            handlers = custom;
            key = event;
        }

        var handler = events[event];

        //  handlers и key определяют, где именно нужно работать с handler.
        //  Скажем, если event это 'click .foo' или 'init', то это будут соответственно
        //  dom['click']['.foo'] и custom['init'].

        //  Строки превращаем в "ссылку" на метод.
        //  При этом, даже если мы изменим прототип (при наследовании, например),
        //  вызываться будут все равно правильные методы.
        if (typeof handler === 'string') {
            handler = proto[handler];
        }

        if (handler === null) {
            //  Особый случай, бывает только при наследовании блоков.
            //  null означает, что нужно игнорировать родительские обработчики события.
            handlers[key] = null;
        } else {
            //  Просто добавляем еще один обработчик.
            handlers = handlers[key] || (( handlers[key] = [] ));
            handlers.push(handler);
        }

    }

    //  Для всех типов DOM-событий этого класса вешаем глобальный обработчик на document.
    for (var type in dom) {
        //  При этом, запоминаем, что один раз мы его уже повесили и повторно не вешаем.
        if (!_docEvents[type]) {
            $(document).on(type, function(e) {
                //  Все обработчики вызывают один чудо-метод:

                //  https://github.com/nanoblocks/nanoblocks/issues/48
                //  Цельнотянуто из jquery:
                //
                //  Make sure we avoid non-left-click bubbling in Firefox (#3861)
                if (e.button && e.type === 'click') {
                    return;
                }

                return Factory._onevent(e);
            });

            _docEvents[type] = true;
        }
    }

    //  Возвращаем структуру, которая будет сохранена в this.events.
    return [
        {
            dom: dom,
            custom: custom
        }
    ];

};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Создаем экземпляр соответствующего класса на переданной ноде node.
//  Опциональный параметр events позволяет сразу навесить на экземпляр блока
//  дополнительных событий (помимо событий, объявленных в nb.define).
Factory.prototype.create = function(node, events) {
    var block;

    var id = node.getAttribute('id');
    if (id) {
        //  Пытаемся достать блок из кэша по id.
        block = _cache[id];
    } else {
        //  У блока нет атрибута id. Создаем его, генерим уникальный id.
        //  В следующий раз блок можно будет достать из кэша при по этому id.
        id = 'nb-' + _id++;
        node.setAttribute('id', id);
    }

    if (!block) {
        //  Блока в кэше нет. Создаем его.

        //  FIXME: Что будет, если node.getAttribute('data-nb') !== this.name ?
        //  У ноды каждого блока должен быть атрибут data-nb.
        if ( node.getAttribute('data-nb') === null ) {
            node.setAttribute('data-nb', this.name);
        }

        block = new this.ctor(node);

        //  Инициализируем блок.
        block.__init(node);

        //  Если переданы events, навешиваем их.
        if (events) {
            for (var event in events) {
                block.on( event, events[event] );
            }
        }

        //  Кэшируем блок. Последующие вызовы nb.block на этой же ноде
        //  достанут блок из кэша.
        _cache[id] = block;
    }

    return block;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Наследуем события.
//  При наследовании классов необходимо склеить список обработчиков класса
//  с соответствующим списком обработчиков родителя.
//
//      {
//          dom: {
//              'click': {
//                  '.foo': [ .... ] // handlers
//                  ...
//
//  и
//
//      {
//          custom: {
//              'init': [ ... ] // handlers
//
//
Factory.prototype._extendEvents = function(base) {
    //  Это всегда "простой" класс (т.е. не миксин), так что всегда берем нулевой элемент.
    var t_dom = this.events[0].dom;
    var b_dom = base.events[0].dom;

    //  Конкатим обработчиков DOM-событий.
    for (var event in b_dom) {
        extend( t_dom[event] || (( t_dom[event] = {} )), b_dom[event] );
    }

    //  Конкатим обработчиков кастомных событий.
    extend( this.events[0].custom, base.events[0].custom );

    function extend(dest, src) {
        for (var key in src) {
            var s_handlers = src[key];
            var d_handlers = dest[key];

            //  Если встречаем null, это значит, что нужно все родительские обработчики выкинуть.
            dest[key] = (d_handlers === null) ? [] : s_handlers.concat( d_handlers || [] );
        }
    }

};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Единый live-обработчик всех DOM-событий.
Factory._onevent = function(e) {
    var type = e.type;

    //  Нода, на которой произошло событие.
    var origNode = e.target;

    //  Для mouseover/mouseout событий нужна особая обработка.
    var isHover = (type === 'mouseover' || type === 'mouseout');
    //  В случае isHover, это нода, из которой (в которую) переместили указатель мыши.
    var fromNode = e.relatedTarget;

    //  Эти переменные условно "глобальные".
    //  Они все используются нижеописанными функциями, которые имеют побочные эффекты.
    //
    //  Очередной отрезок (см. комментарии ниже).
    var nodes;
    //  Длина массива nodes.
    var n;
    //  Массив с соответствующими $(node) для nodes.
    var $nodes;
    //  Текущая нода блока.
    var blockNode;
    //  Текущее имя блока.
    var name;
    //  Текущая фабрика блоков.
    var factory;
    //  Текущий блок. Создание блока откладывается как можно дальше.
    //  До тех пор, пока точно не будет понятно, что найдена нода,
    //  подходящая для одного из DOM-событий блока.
    var block;

    //  Мы проходим вверх по DOM'у, начиная от e.target до самого верха (<html>).
    //  Пытаемся найти ближайший блок, внутри которого случилось событие и
    //  у которого есть событие, подходящее для текущей ноды.

    //  Переменная цикла.
    var node = origNode;
    while (1) {
        //  Цепочку нод от e.target до <html> мы разбиваем на отрезки,
        //  по границам блоков. Например:
        //
        //      <html> <!-- node5 -->
        //          <div data-nb="foo"> <!-- node4 -->
        //              <div> <!-- node3 -->
        //                  <div data-nb="bar"> <!-- node2 -->
        //                      <div> <!-- node1 -->
        //                          <span>Hello</span> <!-- node0 -->
        //
        //  Событие случилось на node0 (она же e.target).
        //  Тогда первый отрезок это [ node0, node1, node2 ], второй [ node3, node4 ], ...
        //
        //  Функция findBlockNodes возращает true, если очередной отрезок удалось найти,
        //  и false, если дошли до самого верха, не найдя больше нод блоков.
        //  При этом, она устанавливает значения переменных nodes, n, $nodes, blockNode, name, factory.
        if ( !findBlockNodes() ) {
            //  Все, больше никаких блоков выше node нет.
            break;
        }

        //  Мы собрали в nodes все ноды внутри блока с именем name.
        factory = Factory.get(name);
        //  Берем все события, на которые подписан этот блок.
        var mixinEvents = factory.events;

        //  Для каждого миксина проверяем все ноды из nodes.
        var r = true;
        for (var i = 0, l = mixinEvents.length; i < l; i++) {
            //  Пытаемся найти подходящее событие для node среди всех событий миксина.
            if ( checkEvents( mixinEvents[i].dom[type] ) === false ) {
                r = false;
            }
        }

        //  Нашли подходящий блок, один из обработчиков события этого блока вернул false.
        //  Значит все, дальше вверх по DOM'у не идем. Т.е. останавливаем "баблинг".
        if (!r) { return false; }

        //  В случае hover-события с определенным fromNode можно останавливаться после первой итерации.
        //  fromNode означает, что мышь передвинули с одной ноды в другую.
        //  Как следствие, это событие касается только непосредственно того блока,
        //  внутри которого находится e.target. Потому что остальные блоки обработали этот ховер
        //  во время предыдущего mouseover/mouseout.
        //
        //  А вот в случае, когда fromNode === null (возможно, когда мышь передвинули, например,
        //  с другого окна в центр нашего окна), все блоки, содержащие e.target должны обработать ховер.
        if (fromNode) { break; }

        //  Идем еще выше, в новый блок.
        node = node.parentNode;

    }

    function findBlockNodes() {
        //  Сбрасываем значения на каждой итерации.
        nodes = [];
        $nodes = [];
        block = null;
        blockNode = null;

        var parent;
        //  Идем по DOM'у вверх, начиная с node и заканчивая первой попавшейся нодой блока (т.е. с атрибутом data-nb).
        //  Условие о наличии parentNode позволяет остановиться на ноде <html>.
        while (( parent = node.parentNode )) {
            if (( name = node.getAttribute('data-nb') )) {
                blockNode = node;
                break;
            }
            //  При этом в nodes запоминаем только ноды внутри блока.
            nodes.push(node);
            node = parent;
        }

        if (blockNode) {
            if (isHover && fromNode) {
                //  Мы передвинули указатель мыши с одной ноды на другую.
                //  Если e.target это и есть нода блока, то внутренних (nodes) нод нет вообще и
                //  нужно проверить только саму ноду блока. Либо же нужно проверить одну
                //  внутреннюю ноду (e.target) и ноду блока.
                nodes = (origNode === blockNode) ? [] : [ origNode ];
            }
            n = nodes.length;

            return true;
        }
    }

    //  Проверяем все ноды из nodes и отдельно blockNode.
    function checkEvents(events) {
        if (!events) { return; }

        var R;
        //  Проверяем, матчатся ли ноды какие-нибудь ноды из nodes на какие-нибудь
        //  селекторы из событий блока.
        var node, $node;
        for (var i = 0; i < n; i++) {
            node = nodes[i];
            //  Лениво вычисляем $node.
            $node = $nodes[i] || (( $nodes[i] = $(node) ));

            for (var selector in events) {
                //  Проверяем, матчится ли нода на селектор.
                if (
                    //  Во-первых, для внутренних нод блока должен быть селектор и нода должна ему соответствовать.
                    selector && $node.is(selector) &&
                    //  Во-вторых, для ховер-событий нужен отдельный костыль,
                    //  "преобразующий" события mouseover/mouseout в mouseenter/mouseleave.
                    !(
                        //  Если мы пришли из ноды fromNode,
                        isHover && fromNode &&
                        //  то она должна лежать вне этой ноды.
                        $.contains(node, fromNode)
                    )
                ) {
                    //  Вызываем обработчиков событий.
                    var r = doHandlers( node, events[selector] );
                    if (r === false) {
                        R = r;
                    }
                }
            }

            //  Стоп "баблинг"! В смысле выше по DOM'у идти не нужно.
            if (R === false) { return R; }
        }

        //  Отдельно обрабатываем ситуацию, когда node === blockNode.
        //  В этом случае мы смотрим только события без селекторов.
        //  События с селектором относятся только к нодам строго внутри блока.
        var handlers = events[''];
        //  Опять таки костыль для ховер-событий.
        if ( handlers && !( isHover && fromNode && $.contains(blockNode, fromNode)) ) {
            return doHandlers(blockNode, handlers);
        }
    }

    function doHandlers(node, handlers) {
        //  Блок создаем только один раз и только, если мы таки дошли до сюда.
        //  Т.е. если мы нашли подходящее для node событие.
        block = block || factory.create(blockNode);

        //  В handlers лежит цепочка обработчиков этого события.
        //  Самый последний обработчик -- это обработчик собственно этого блока.
        //  Перед ним -- обработчик предка и т.д.
        //  Если в nb.define не был указан базовый блок, то длина цепочки равна 1.
        for (var i = handlers.length; i--; ) {
            //  В обработчик передаем событие и ноду, на которой он сработал.
            var r = handlers[i].call(block, e, node);
            //  Обработчик вернул false или null, значит оставшиеся обработчики не вызываем.
            //  При этом false означает, что не нужно "баблиться" выше по DOM'у.
            if (r === false) { return false; }
            if (r === null) { break; }
        }
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Достаем класс по имени.
//  Имя может быть "простым" -- это классы, которые определены через nb.define.
//  Или "сложным" -- несколько простых классов через пробел (микс нескольких блоков).
Factory.get = function(name) {
    //  Смотрим в кэше.
    var factory = _factories[name];

    //  В кэше нет, это будет "сложный" класс, т.к. все простые точно в кэше есть.
    if (!factory) {
        //  Пустой конструктор.
        var ctor = function() {};

        var events = [];

        var names = name.split(/\s+/);
        if (names.length < 2) {
            throw "Block '" + name + "' is undefined";
        }
        for (var i = 0, l = names.length; i < l; i++) {
            //  Примиксовываем все "простые" классы.
            var mixin = Factory.get( names[i] );
            nb.inherit(ctor, mixin.ctor);

            //  Собираем массив из структур с событиями.
            //  mixin.events[0] -- здесь 0 потому, что у "простых" классов там всегда один элемент.
            events.push( mixin.events[0] );
        }

        //  Создаем новую фабрику для миксового класса.
        factory = new Factory(name, ctor, events);

        //  Запоминаем в кэше.
        _factories[name] = factory;
    }

    return factory;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Интерфейсная часть
//  ------------------

//  Метод создает блок на заданной ноде:
//
//      var popup = nb.block( document.getElementById('popup') );
//
nb.block = function(node, events) {
    var name = node.getAttribute('data-nb');
    if (!name) {
        //  Эта нода не содержит блока. Ничего не делаем.
        return null;
    }

    return Factory.get(name).create(node, events);
};

//  Находим ноду по ее id, создаем на ней блок и возвращаем его.
nb.find = function(id) {
    var node = document.getElementById(id);
    if (node) {
        return nb.block(node);
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Метод определяет новый блок (точнее класс):
//
//      nb.define('popup', {
//          //  События, на которые реагирует блок.
//          events: {
//              'click': 'onclick',             //  DOM-событие.
//              'click .close': 'onclose',      //  DOM-событие с уточняющим селектором.
//              'open': 'onopen',               //  Кастомное событие.
//              'close': function() { ... }     //  Обработчик события можно задать строкой-именем метода, либо же функцией.
//              ...
//          },
//
//          //  Дополнительные методы блока.
//          'onclick': function() { ... },
//          ...
//      });
//
nb.define = function(name, methods, base) {
    if (typeof name !== 'string') {
        //  Анонимный блок.

        //  Сдвигаем параметры.
        base = methods;
        methods = name;
        //  Генерим ему уникальное имя.
        name = 'nb-' + _id++;
    }

    if (base) {
        base = Factory.get(base);
    }

    //  Вытаскиваем из methods информацию про события.
    var events = methods.events;
    //  Оставляем только методы.
    delete methods.events;

    //  Пустой конструктор.
    var ctor = function() {};
    //  Наследуемся либо от дефолтного конструктора, либо от указанного базового.
    nb.inherit( ctor, (base) ? base.ctor : Block );
    //  Все, что осталось в methods -- это дополнительные методы блока.
    nb.extend(ctor.prototype, methods);

    var factory = new Factory(name, ctor, events);

    //  Если указан базовый блок, нужно "склеить" события.
    if (base) {
        factory._extendEvents(base);
    }

    //  Сохраняем для дальнейшего применения.
    //  Достать нужную factory можно вызовом Factory.get(name).
    _factories[name] = factory;

    return factory;
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Неленивая инициализация.
//  Находим все ноды с классом _init и на каждой из них инициализируем блок.
//  По-дефолту ищем ноды во всем документе, но можно передать ноду,
//  внутри которой будет происходить поиск. Полезно для инициализации динамически
//  созданных блоков.
nb.init = function(where) {
    where = where || document;

    var nodes = $(where).find('._init');
    for (var i = 0, l = nodes.length; i < l; i++) {
        nb.block( nodes[i] );
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Создаем "космос".
//  Физически это пустой блок, созданный на ноде html.
//  Его можно использовать как глобальный канал для отправки сообщений
//  и для навешивания разных live-событий на html.
var space = nb.define({
    events: {
        'click': function(e) {
            nb.trigger('space:click', e.target);
        }
    }
}).create( document.getElementsByTagName('html')[0] );

nb.on = function(name, handler) {
    return space.on(name, handler);
};

nb.off = function(name, handler) {
    space.off(name, handler);
};

nb.trigger = function(name, params) {
    space.trigger(name, params);
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Инициализация библиотеки
//  ------------------------

$(function() {
    //  Инициализируем все неленивые блоки.
    nb.init();
});

//  ---------------------------------------------------------------------------------------------------------------  //

})();

nb.vec = {};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Складывает два вектора.
nb.vec.add = function(a, b, s) {
    s = s || 1;
    return [ a[0] + s * b[0], a[1] + s * b[1] ];
};

//  Скалярно умножает два вектора.
nb.vec.mulS = function(a, b) {
    return a[0] * b[0] + a[1] * b[1];
};

//  Умножает матрицу на вектор.
nb.vec.mulM = function(m, a) {
    return [ nb.vec.mulS(m[0], a), nb.vec.mulS(m[1], a) ];
};

//  "Растягивает" вектор. Либо на скаляр, либо на вектор.
nb.vec.scale = function(a, b) {
    b = (typeof b === 'number') ? [ b, b ] : b;
    return [ a[0] * b[0], a[1] * b[1] ];
};

//  Превращаем строку направления вида в соответствующий вектор.
//  Например, 'right top' -> (1, -1)
//
//  (l, t)       (c, t)      (r, t)
//         *-------*-------*
//         |               |
//         |               |
//  (l, c) *     (c, c)    * (r, c)
//         |               |
//         |               |
//         *-------*-------*
//  (l, b)       (c, b)      (r, b)
//
nb.vec.dir2vec = function(dir) {
    return [ nb.vec.dirs[ dir[0] ], nb.vec.dirs[ dir[1] ] ];
};

nb.vec.dirs = {
    left: -1,
    center: 0,
    right: 1,
    top: -1,
    bottom: 1
};

nb.vec.flipDir = {
    left: 'right',
    right: 'left',
    top: 'bottom',
    bottom: 'top'
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Создаем из ноды прямоугольник: верхний левый угол и вектор-диагональ.
nb.rect = function(node) {
    if (node instanceof Array) {
        return [ node, [ 0, 0 ] ];
    }

    var $node = $(node);
    var offset = $node.offset();

    return [
        [ offset.left, offset.top ],
        [ $node.outerWidth(), $node.outerHeight() ]
    ];
};

//  Сдвигает прямоугольник.
nb.rect.move = function(r, a) {
    return [ nb.vec.add(r[0], a), r[1] ];
};

//  "Нормирует" прямоугольник.
nb.rect.norm = function(r) {
    var x = r[0];
    var y = nb.vec.add( x, r[1] );

    var a = [ Math.min( x[0], y[0] ), Math.min( x[1], y[1] ) ];
    var b = [ Math.max( x[0], y[0] ), Math.max( x[1], y[1] ) ];

    return [ a, nb.vec.add(b, a, -1) ];
};

//  Трансформирует прямоугольник.
nb.rect.trans = function(r, m) {
    r = [ nb.vec.mulM( m, r[0] ), nb.vec.mulM( m, r[1] ) ];
    return nb.rect.norm(r);
};

nb.rect.dir2vec = function(r, dir) {
    //  Полудиагональ.
    var h = nb.vec.scale( r[1], 0.5 );
    //  Центр прямоугольника.
    var c = nb.vec.add( r[0], h );
    //  Вектор, указывающий из центра прямоугольника на одну из 9 точек прямоугольника.
    //  См. комментарий к nb.vec.dir2vec.
    var d = nb.vec.scale( nb.vec.dir2vec(dir), h );

    //  Одна из 9 точек.
    return nb.vec.add(c, d);
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Сдвигаем прямоугольник what относительно where так, чтобы, совпали две заданные точки привязки (их всего 9).
//  Например, правый верхний угол what совпал с левым верхним углом where.
//
//            what            where
//  *----------*----------*----*----*
//  |                     |         |
//  |                     *    *    *
//  |                     |         |
//  *          *          *----*----*
//  |                     |
//  |                     |
//  |                     |
//  *----------*----------*

//  what и where -- прямоугольники.
//  В how может быть массив вида:
//
//      [
//          'right top',    // Точка привязки для what.
//          'left top'      // Точка привязки для where.
//      ]
//
nb.rect.adjust = function(what, where, how) {
    //  Точка приложения what.
    var a = nb.rect.dir2vec(what, how.what);
    //  Точка приложение where.
    var b = nb.rect.dir2vec(where, how.where);

    //  Смещаем what на смещение от a к b.
    return {
        rect: nb.rect.move( what, nb.vec.add(b, a, -1) ),
        point: b
    };
};


/* ../libs/nanoblocks.js end */


/* button/button.js begin */
nb.define('button', {
    events: {
        'init': 'oninit',
        'click': 'makeFocus',
        'focusout': 'blur',
        'focusin': 'makeFocus',
        'textChange': 'onTextChange'
    },

    oninit: function () {
        this.$node = $(this.node);
        this.focused = false;

        nb.on('button-focusout', function () {
            this.trigger('focusout');
        });
    },

    /**
     * Changes text of the button
     * @param name — event id that caused the change
     * @param params — {
     *     text: '..'
     * }
     */
    onTextChange: function (name, params) {
        this.$node.find('.nb-button__text').html(params.text)
    },

    makeFocus: function (e, button) {
        if (this.$node.is('.nb-button_disabled')) {
            return false;
        }

        if (!this.$node.is(':focus')) {
            nb.trigger('button-focusout');
            this.$node.addClass('nb-button_focus');
            this.$node.focus();


        }
        this.focused = true;
    },
    blur: function () {
        this.$node.removeClass('nb-button_focus');
        this.focused = false;
    }
})
/* button/button.js end */

/* select/select.js begin */
nb.define('select', {
    events: {
        'init': 'onInit',
        'changeValue': 'onChangeValue'
    },

    onInit: function () {
        var that = this
        nb.init(that)

        // find elements and values
        var c = that.children()
        that.button = c[0]
        that.popup = c[1]
        that.$fallback = $(that.node).find('.nb-select__fallback')
        that.value = that.$fallback.find('option[selected]').attr('value')
        that.text = that.$fallback.find('option[selected]').html()

        // preparing control depending on configuration and content
        that.controlPrepare()

        // subscribe through space to the event from a child popups
        nb.on('select:' + that.popup.node.getAttribute('id') + ':change', function (name, params) {
            that.trigger('changeValue', params)
        })

        that._onkeypress = function (e) {
            var button = that.button;
            var popup = that.popup;

            if (e.keyCode === 13 || e.keyCode === 40 || e.keyCode === 38) {
                if (!popup.opened) {
                    if (!button.focused || button.getMod('_disabled')) {
                        return;
                    }

                    var data = button.data()['popup-toggler'];
                    if (popup) {
                        popup.trigger('open', {
                            where: data.where || button.node,
                            how: data.how
                        });

                        return false;
                    }
                } else {
                    var $selected = $(popup.node).find('.nb-select__item_selected_yes')
                    if (e.keyCode === 40) {
                        e.preventDefault()

                        if ($selected.next().length) {
                            popup.selectItem($selected.next())
                        }
                        return false;
                    } else if (e.keyCode === 38) {
                        e.preventDefault()

                        if ($selected.prev().length) {
                            popup.selectItem($selected.prev())
                        }
                        return false;
                    }
                }
            }
        }

        $(document).on('keydown', this._onkeypress);
    },

    /**
     * preparing control depending on configuration and content
     */
    controlPrepare: function () {
        // minimum width of the popup set to the size of the button
        $(this.popup.node).css({
            'min-width': $(this.button.node).outerWidth() - 2
        })
    },

    /**
     * Changes a value of control, text on the button and select value it the fallback
     *
     * @param name — event id that caused the change
     * @param params — {
         *     text: '..'
         *     value: '..'
         * }
     */
    onChangeValue: function (name, params) {
        this.value = params.value
        this.text = params.text
        this.button.trigger('textChange', params)
        this.$fallback.find('option[selected]').removeAttr('selected')
        this.$fallback.find('option[value = ' + params.value + ']').attr('selected', 'selected')
    }
})



/* select/select.js end */

/* radio-button/radio-button.js begin */
nb.define('radio-button', {
    // events: {
    //     'init': 'init',
    //     'click .nb-button': 'select'
    // },

    // init: function() {
    //     this.$node = $(this.node);
    //     this.$buttons = this.$node.children('.nb-button');
    // },

    // select: function(e, button) {
    //     this.deselectAll();
    //     var $button = $(button);
    //     $button
    //         .addClass('nb-button_checked')
    // },

    // deselectAll: function() {
    //     this.$buttons.removeClass('nb-button_checked');
    // }
});
/* radio-button/radio-button.js end */

/* popup/popup.js begin */
;(function () {

    var popup = {
        cfg: {
            // Время анимации попапа
            animationTime: 150,

            // Дистанция с которой появляется поап
            animationDistance: 10,

            // Расстояние на которое попап отстает от тригера
            tailOffset: 23
        }
    };

// ----------------------------------------------------------------------------------------------------------------- //

    popup.events = {
        'init': 'oninit',
        'open': 'onopen',
        'close': 'onclose',

        'click .nb-popup__close': 'onclose',
        'click .nb-select__item': 'onClick'
    };

// ----------------------------------------------------------------------------------------------------------------- //

    popup.oninit = function () {
        var data = this.data();

        this.opened = false;

        if ('modal' in data) {
            this.modal = true;
            this.$paranja = $(this.node).siblings('nb-paranja')
        }

        //  У попапа есть "хвостик".
        this.$selectParent = $(this.node).parents('.nb-select');
        this.$tail = $(this.node).find('.nb-popup__tail');
        this.hasTail = !!this.$tail.length;
        this.inSelect = !!this.$selectParent.length;

        // Храним исходное положение попапа, чтобы возвращать его на место
        var previous = this.node.previousSibling;
        this._home = previous ? { previous: previous } : { parent: this.node.parentNode };
    };

// ----------------------------------------------------------------------------------------------------------------- //

    popup.onopen = function (e, params) {
        var where = params.where;
        var how = params.how;

        //  FIXME: Нужно сделать отдельный флаг this.visible.

        //  Специальный флаг-костыль.
        //  Если он true, то это значит, что мы только что передвинули открытый попап в другое место
        //  и его не нужно закрывать на клик.
        this.moved = false;

        if (this.where) {
            //  Попап уже открыт
            //  FIXME: Буэээ. Уродливое условие для варианта, когда заданы координаты вместо ноды.
            if (where === this.where || ( (where instanceof Array) && where[0] === this.where[0] && where[1] === this.where[1] )) {
                //  На той же ноде. Значит закрываем его.
                this.trigger('close');
            } else {
                this.moved = true;
                //  На другой ноде. Передвигаем его в нужное место.
                this._move(where, how);
            }
        } else {
            //  Попап закрыт. Будем открывать.

            //  На всякий случай даем сигнал, что нужно закрыть все открытые попапы.
            nb.trigger('popup-close');

            //  Включаем паранджу, если нужно.
            if (this.modal) {
                //  Ноду блока переносим внутрь паранджи.
                $paranja().append(this.node).show();
            } else {
                //  Переносим ноду попапа в самый конец документа,
                //  чтобы избежать разных проблем с css.
                $('body').append(this.node);
            }

            $(this.node).removeClass('_hidden');
            //  Передвигаем попап.
            this._move(where, how);
            //  Вешаем события, чтобы попап закрывался по нажатие ESC и клику вне попапа.
            this._bindClose();

            //  Показываем.
            $(this.node).animate(
                this._animateParams(this.data('direction')).forward,
                this.cfg.animationTime
            );
            this.trigger('show');

            this.opened = true;

            // Сообщаем в космос, что открылся попап
            nb.trigger('popup-opened', this);
        }
    };

    popup.onclose = function () {
        var that = this
        //  Снимаем все события, которые повесили в open.
        this._unbindClose();
        //  Снимаем флаг о том, что попап открыт.
        this.where = null;
        //  Прячем.
        if (this.modal) {
            $paranja().hide();
        }

        $(this.node).animate(
            that._animateParams(that.data('direction')).reverse,
            that.cfg.animationTime,
            function () {
                $(this).addClass('_hidden');

                that.trigger('hide');

                // Возвращаем ноду попапа на старое место
                if (that._home.previous) {
                    $(that._home.previous).after(that.node);
                } else if (that._home.parent) {
                    $(that._home.parent).prepend(that.node);
                }

                // Сообщаем в космос, что закрылся попап
                nb.trigger('popup-closed', that);
            });
        this.opened = false;
    };

// ----------------------------------------------------------------------------------------------------------------- //

    popup._move = function (where, how) {
        //  FIXME: Не нужно это делать в _move().
        //  Запоминаем, на какой ноде мы открываем попап.
        this.where = where;

        //  Модальный попап двигать не нужно.
        if (this.modal) {
            return;
        }

        how = normalizeHow(how);

        //  Изначальные прямоугольники для what и where.
        var orig_what = nb.rect(this.node);
        where = nb.rect(where);

        //  Adjusted what -- т.е. мы what передвинули так, чтобы точки привязки what и where совпадали.
        //  adj_what -- это объект с двумя свойствами:
        //
        //    * rect -- это собственно сдвинутый what.
        //    * point -- это точка привязки, куда мы его сдвинули.
        //
        var adj_what = nb.rect.adjust(orig_what, where, how);
        var what = adj_what.rect;

        var tailDir;
        var needTail = this.hasTail && (( tailDir = this._tailDirs(how.what, how.where) ));

        if (needTail) {
            //  Показываем "хвост" с нужной стороны попапа.
            this.setMod('nb-popup_tail_to', tailDir[1]);

            // Запоминаем направление
            this.data('direction', tailDir[1])

            var css = { left: '', right: '', top: '', bottom: '' };

            //  Позиционируем "хвост", если он должен быть не по-центру попапа.
            if (tailDir[0] !== 'center') {
                //  Сдвиг, который делает точку привязки началом координат.
                var offset2origin = nb.vec.scale(adj_what.point, -1);

                //  Преобразование в "положение 1".
                var transform = transforms[ tailDir.join(' ') ];

                var t_what = nb.rect.trans(nb.rect.move(what, offset2origin), transform);
                var t_where = nb.rect.trans(nb.rect.move(where, offset2origin), transform);

                //  После этих преобразований мы получаем, что точка привязки сместилась в начало координат,
                //  левый нижний угол where в начале координат, левый верхний угол what в начале координат.
                //
                //  -------------
                //  |   where   |
                //  |           |
                //  *-------------------
                //  |       what       |
                //  |                  |
                //  |                  |
                //  |                  |
                //  --------------------
                //

                //  Слевы положение "хвоста" ограничено некой константой.
                var MIN_LEFT = 18;
                //  Справа -- минимумом из середин what и where.
                var r = Math.min(t_what[1][0] / 2, t_where[1][0] / 2);

                var x, y;
                if (MIN_LEFT <= r) {
                    //  Для "хвоста" достаточно места.

                    x = r;
                } else {
                    //  "Хвост" не влезает, поэтому необходимо подвинуть и сам попап.

                    x = MIN_LEFT;
                    t_what = nb.rect.move(t_what, [ r - MIN_LEFT, 0 ]);
                }

                //  Зазор для "хвоста".
                t_what = nb.rect.move(t_what, [ 0, this.cfg.tailOffset]);

                //  Делаем обратное преобразование попапа...
                what = nb.rect.move(nb.rect.trans(nb.rect.trans(nb.rect.trans(t_what, transform), transform), transform), adj_what.point);
                //  ...и смещения для "хвоста".
                var tailOffset = nb.vec.mulM(transform, nb.vec.mulM(transform, nb.vec.mulM(transform, [ x, 0])));

                //  Позиционируем "хвост".
                x = tailOffset[0];
                y = tailOffset[1];

                var AUTO = 'auto';
                if (x > 0) {
                    css.left = x;
                    css.right = AUTO;
                } else if (x < 0) {
                    css.left = AUTO;
                    css.right = -x;
                } else if (y > 0) {
                    css.top = y;
                    css.bottom = AUTO;
                } else {
                    css.top = AUTO;
                    css.bottom = -y;
                }
            } else {
                //  Зазор для "хвоста".
                what = nb.rect.move(what, nb.vec.scale(nb.vec.dir2vec(how.where), this.cfg.tailOffset));
            }

            this.$tail.css(css).show();
        } else {
            this.$tail.hide();
        }

        //  Позиционируем попап.
        $(this.node).css({
            left: what[0][0],
            top: what[0][1]
        });

    };

    function normalizeHow(how) {
        //  Дефолтное направление открытия.
        how = how || { dir: 'bottom' };

        var what, where;

        //  Если направление задано через dir, пересчитываем это в what/where.
        if (how.dir) {
            //  Скажем, если dir === 'bottom', то where === 'bottom', а what === 'top'.
            //  nb.vev.flipDir возвращает противоположное направление.
            what = nb.vec.flipDir[ how.dir ];
            where = how.dir;
        } else {
            what = how.what;
            where = how.where;
        }

        return {
            what: normalizeDir(what),
            where: normalizeDir(where)
        };
    }


    var transforms = {
        'left bottom': [
            [  1, 0 ],
            [  0, 1 ]
        ],
        'right bottom': [
            [ -1, 0 ],
            [  0, 1 ]
        ],
        'top left': [
            [  0, 1 ],
            [ -1, 0 ]
        ],
        'bottom left': [
            [  0, -1 ],
            [ -1, 0 ]
        ],
        'right top': [
            [ -1, 0 ],
            [  0, -1 ]
        ],
        'left top': [
            [  1, 0 ],
            [  0, -1 ]
        ],
        'bottom right': [
            [  0, -1 ],
            [  1, 0 ]
        ],
        'top right': [
            [  0, 1 ],
            [  1, 0 ]
        ]
    };

    popup._animateParams = function (dir) {
        var res = {
            forward: {
                opacity: 1
            },
            reverse: {
                opacity: 0
            }
        }
        switch (dir) {
            case 'left':
                res.forward['left'] = '+=' + this.cfg.animationDistance;
                res.reverse['left'] = '-=' + this.cfg.animationDistance;
                break;
            case 'right':
                res.forward['left'] = '-=' + this.cfg.animationDistance;
                res.reverse['left'] = '+=' + this.cfg.animationDistance;
                break;
            case 'top':
                res.forward['top'] = '+=' + this.cfg.animationDistance;
                res.reverse['top'] = '-=' + this.cfg.animationDistance;
                break;
            case 'bottom':
                res.forward['top'] = '-=' + this.cfg.animationDistance;
                res.reverse['top'] = '+=' + this.cfg.animationDistance;
                break;
        }
        return res
    };

    function normalizeDir(dir) {
        dir = dir || '';

        var parts;
        switch (dir) {
            //  Если направление не задано, считаем, что это 'center center'.
            case '':
                parts = [ 'center', 'center' ];
                break;

            //  Если задано только одно направление, второе выставляем в 'center'.
            case 'left':
            case 'right':
            case 'center':
                parts = [ dir, 'center' ];
                break;

            case 'top':
            case 'bottom':
                parts = [ 'center', dir ];
                break;

            default:
                parts = dir.split(/\s+/);

                //  В случае 'top right' и т.д. переставляем части местами.
                //  Одного сравнения недостаточно, потому что может быть 'top center' или 'center left'.
                if (/^(?:left|right)/.test(parts[1]) || /^(?:top|bottom)/.test(parts[0])) {
                    parts = [ parts[1], parts[0] ];
                }
        }

        return parts;
    }

    popup._tailDirs = function (what, where) {

        if (what[0] === where[0] && nb.vec.flipDir[ what[1] ] === where[1]) {
            return where;
        }

        if (what[1] === where[1] && nb.vec.flipDir[ what[0] ] === where[0]) {
            return [ where[1], where[0] ];
        }

    }

// ----------------------------------------------------------------------------------------------------------------- //

//  Вешаем события перед открытием попапа, чтобы он закрывался при:
//
//    * Нажатии ESC;
//    * Клике в любое место вне попапа;
//    * При получении глобального события `popup-close`.
//
//  В случае необходимости, можно закрыть все открытые попапы вот так:
//
//      nb.trigger('popup-close');
//
    popup._bindClose = function () {
        var that = this;

        this._onkeypress = function (e) {
            if (e.keyCode === 27 || e.keyCode === 9) {
                that.trigger('close');
            }
        };
        $(document).on('keydown', this._onkeypress);

        this._onclick = function (e, target) {
            if (that.moved) {
                that.moved = false;
                return;
            }
            //  Проверяем, что клик случился не внутри попапа и не на ноде, на которой попап открыт (если открыт).
            if ((that.node !== target) && !$.contains(that.node, target) && !( that.where && !( that.where instanceof Array ) && ( $.contains(that.where, target) || that.where == target ) )) {
                that.trigger('close');
            }
        };
        nb.on('space:click', this._onclick);

        this._onpopupclose = nb.on('popup-close', function () {
            that.trigger('close');
        });
    };

//  Снимаем все события, повешенные в `_bindClose`.
    popup._unbindClose = function () {
        if (this.where) {
            $(document).off('keydown', this._onkeypress);
            nb.off('space:click', this._onclick);
            nb.off('popup-close', this._onpopupclose);
        }
        this._onkeypress = this._onclick = this._onpopupclose = null;
    };

    /**
     * Handle event on element select if there is one inside
     * Changes selected item and trigger events through space
     * @param e - event
     */
    popup.onClick = function (e) {
        var $target = $(e.target)
        var $item = $target.attr('nb-select-value') ? $target : $target.parents('*[nb-select-value]')

        this.selectItem($item)

        if (e.type == 'click') {
            this.trigger('close')
        }
    },

    popup.selectItem = function (item) {
        var value = $(item).attr('nb-select-value');
        var text = $(item).find('.nb-select__text').html();

        $(this.node).find('.nb-select__item_selected_yes').removeClass('nb-select__item_selected_yes');
        $(item).addClass('nb-select__item_selected_yes');

        nb.trigger('select:' + this.node.getAttribute('id') + ':change', {
           value: value,
           text: text
        });
    }

// ----------------------------------------------------------------------------------------------------------------- //

    nb.define('popup', popup);

})();

// ----------------------------------------------------------------------------------------------------------------- //

nb.define('popup-toggler', {

    events: {
        'click': 'onclick'
    },

    'onclick': function () {
        if (this.getMod('_disabled')) {
            return;
        }

        var data = this.data()['popup-toggler'];

        //  Находим соответствующий попап.
        //  Соответствие задается атрибутом `id`.
        var popup = nb.find(data['id']);

        if (popup) {
            popup.trigger('open', {
                //  Относительно чего позиционировать попап.
                //  Если заданы точные координаты в `data.where`, то по ним.
                //  Иначе относительно ноды этого блока.
                where: data.where || this.node,

                //  Как позиционировать попап.
                how: data.how
            });

            return false;
        }
    }

});

//  ---------------------------------------------------------------------------------------------------------------  //


/* popup/popup.js end */

/* input/input.js begin */
nb.define('input', {
    events: {
             'init': 'oninit',
             'click': 'makeFocus',
             'focusout': 'blur',
             'focusin': 'makeFocus'
         },

        oninit: function(){
            this.$node = $(this.node);
            this.focused = false;
            nb.on('input-focusout', function() {
                 this.trigger('focusout');

            });
        },

        makeFocus: function(){
            if (this.$node.is('.nb-input_disabled')) {
                return false;
            }

            if (!this.$node.hasClass('nb-input_focus')) {
                nb.trigger('input-focusout');
                this.$node.addClass('nb-input_focus');
                this.focused = true;
            }
        },

        blur: function() {
            this.$node.removeClass('nb-input_focus');
            this.focused = false;
        }
});
/* input/input.js end */

/* input-group/input-group.js begin */
nb.define('input-group', {
    events: {
        'click': 'click',
        'focusout': 'blur'
    },

    click: function(e, input) {
        var $node = $(this.node);

        if (!$node.hasClass('nb-input_focus')) {
            $node.addClass('nb-input_focus');
            $node.children('.nb-input').select();
        }
    },

    blur: function() {
        $(this.node).removeClass('nb-input_focus');
    }
});
/* input-group/input-group.js end */

/* progress/progress.js begin */
nb.define('progress', {
    events: {
        'init': 'oninit'
    },

    oninit: function() {
        var data = this.data();

        if ('type' in data) {
            this.type = data.type;
        }

        this.$title = $(this.node).find('.js-title');
        this.$bar = $(this.node).find('.js-bar');
    },

    /**
     * Изменяет значение прогресс бара
     * @param {String} Новое значение.
     */

    update: function(newVal) {
        var newVal = parseFloat(newVal, 10)

        this.$bar.css({width: newVal + '%'})

        if (this.type == 'percentage'){
            this.$title.html(newVal + '%')
        }

        this.data('progress', newVal)
    },

    /**
     * Меняет значение на единицу
     */
    tick: function() {
        var newVal = parseFloat(this.data('progress'), 10)

        newVal < 100 ? newVal++ : newVal

        this.update(newVal)
    }
})
/* progress/progress.js end */


/* dialog/dialog.js begin */
nb.define('dialog', {
    events: {}
})

/* dialog/dialog.js end */

