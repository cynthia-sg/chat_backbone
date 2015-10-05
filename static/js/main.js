
// Author: Sergio Castaño Arteaga
// Email: sergio.castano.arteaga@gmail.com

(function($){

    var debug = false;

    // Users
    window.UserModel = Backbone.Model.extend();

    window.UsersCollection = Backbone.Collection.extend({
        model: UserModel,
    });

    window.UserView = Backbone.View.extend({
        tagName: 'span',
        className: 'badge badge-inverse',
        id : function () { 
            return this.model.get("room") + "-" + this.model.get("id");
        },

        initialize: function() {
            this.model.view = this;
            this.listenTo(this.model, 'change', this.render);
            this.listenTo(this.model, 'remove', this.removeUser);
        },

        render: function() {
            var source = $('#user-template').html();
            var template = Handlebars.compile(source);
            var html = template(this.model.toJSON());
            
            $(this.el).html(html);
            return this;
        },

        removeUser: function() {
            this.remove();
        }
    });

    window.UsersView = Backbone.View.extend({
        initialize: function(attrs) {
            this.parent = attrs.parent;

            this.listenTo(attrs.collection, 'add', this.addUser);
            this.listenTo(attrs.collection, 'remove', this.removeUser);
        },

        addUser: function(user) {
            var view = new UserView({model: user});
            $(this.parent).find(this.$el).append(view.render().el);
        },

        removeUser: function(user) {
            var view = new UserView({model: user});
            view.remove();
        },

        changeUser: function(user) {
            var view = new UserView({model: user});
            view.render;
        }
    });

    // Messages
    window.MessageModel = Backbone.Model.extend();

    window.MessagesCollection = Backbone.Collection.extend({
        model: MessageModel
    });
    window.messages = new MessagesCollection();

    window.MessageView = Backbone.View.extend({
        initialize: function() {
            this.model.view = this;
        },

        render: function() {
            var source = $('#msg-template').html();
            var template = Handlebars.compile(source);
            var html = template(this.model.toJSON());
            
            $(this.el).html(html);
            return this;
        }
    });

    window.MessagesView = Backbone.View.extend({
        initialize: function(attrs) {
            this.parent = attrs.parent;
            this.listenTo(attrs.collection, 'add', this.addMessage);
        },        

        addMessage: function(msg) {
            var view = new MessageView({model: msg});
            $(this.parent).find($(this.el)).append(view.render().el);

            // Scroll bottom
            $(this.el).scrollTop($(this.el)[0].scrollHeight);
        }
    });

    // Rooms
    window.RoomModel = Backbone.Model.extend({
        defaults: {
            users: new UsersCollection(),
            messages: new MessagesCollection()
        }
    });

    window.RoomsCollection = Backbone.Collection.extend({
        model: RoomModel
    });
    window.rooms = new RoomsCollection();

    window.RoomView = Backbone.View.extend({
        defaults: {
            active: false 
        },
        tagName: 'div',
        className: function() {
            if (this.model.get("active")) {
                return "tab-pane active";
            } else {
                return "tab-pane";
            }
        },
        id : function () { 
            return this.model.get("room");
        },

        initialize: function() {
            this.model.view = this;
            this.listenTo(this.model, 'remove', this.removeRoom);
        },

        removeRoom: function() {
            this.remove();
        },

        render: function() {
            var source = $('#room-template').html();
            var template = Handlebars.compile(source);
            var html = template(this.model.toJSON());
            
            this.$el.html(html);
            return this;
        }
    });

    window.RoomsView = Backbone.View.extend({
        el: $("#newRooms"),

        initialize: function() {
            this.listenTo(rooms, 'add', this.addRoom);
        },        

        addRoom: function(room) {
            var view = new RoomView({model: room});
            $(this.el).append(view.render().el);

            var usersView = new UsersView({ room: room.get("room"), el: $("#" + room.get("room") + "_roomUsers"), collection: rooms.get(room.get("room")).get("users"), parent: view.el }); 
            var messagesView = new MessagesView({ room: room.get("room"), el: $("#" + room.get("room") + "_roomMessages"), collection: rooms.get(room.get("room")).get("messages"), parent: view.el });    
        }

    });
    window.roomsView = new RoomsView();

    window.RoomTabView = Backbone.View.extend({
        tagName: 'li',
        id: function() {
            return this.model.get("room") + "_tab";
        },
        className: function() {
            if (this.model.get("active")) {
                return "active";
            }
        },

        initialize: function() {
            this.model.view = this;
            this.listenTo(this.model, 'remove', this.removeTabRoom);

            // Add welcome message
            var info = {'room':this.model.get("room"), 'username':'ServerBot', 'msg':"----- Welcome to the chat server ----"};
            addMessage(info);  

            // Add serverBot user
            var serverBotUser = {'id': 0, 'username': "ServerBot", 'room': this.model.get("room")};
            addUser(serverBotUser);
        },

        removeTabRoom: function() {
            this.remove();
        },

        render: function() {
            var source = $('#roomTab-template').html();
            var template = Handlebars.compile(source);
            var html = template(this.model.toJSON());
            
            this.$el.html(html);
            return this;
        }
    });

    window.RoomsTabView = Backbone.View.extend({
        el: $("#rooms_tabs"),

        initialize: function() {
            this.listenTo(rooms, 'add', this.addTabRoom);
        },        

        addTabRoom: function(room) {
            var view = new RoomTabView({model: room});
            $(this.el).append(view.render().el);

            $(view.render().el).find("a").click();
        }
    });
    window.roomsTabView = new RoomsTabView();

    // We create a new room
    function generateRoom(roomName) {
        var activeTab = false;
        if (roomName == "MainRoom") {
            activeTab = true;
        }

        // Add new room to collection
        rooms.add(new RoomModel({
            room: roomName,
            id: roomName,
            active: activeTab,
            users: new UsersCollection(),
            messages: new MessagesCollection()
        })); 

        // Get users connected to room
        socket.emit('getUsersInRoom', {'room':roomName});
    }

    // Router
    window.AppRouter = Backbone.Router.extend({
        routes: {
            "room/:id": "joinRoom" // http://localhost:8888/#room/room1
        },

        joinRoom: function(id) {
            socket.emit('subscribe', {'rooms': [id]}); 
        }
    });
    // Instantiate the router
    window.app_router = new AppRouter();


    // ***************************************************************************
    // Socket.io events
    // ***************************************************************************
    
    var socket = io.connect('http://localhost:8888');

    // Connection established
    socket.on('connected', function (data) {

        // We create MainRoom
        generateRoom("MainRoom");

        // Call to begin monitoring uri and route changes
        Backbone.history.start();

        if (debug) {
            // Subscription to rooms
            socket.emit('subscribe', {'username':'sergio', 'rooms':['sampleroom']});

            // Send sample message to room
            socket.emit('newMessage', {'room':'sampleroom', 'msg':'Hellooooooo!'});

            // Auto-disconnect after 10 minutes
            setInterval(function() {
                socket.emit('unsubscribe', {'rooms':['sampleroom']});
                socket.disconnect();
            }, 600000);
        }
    });

    // Disconnected from server
    socket.on('disconnect', function (data) {
        var info = {'room':'MainRoom', 'username':'ServerBot', 'msg':'----- Lost connection to server -----'};
        addMessage(info);
    });
    
    // Reconnected to server
    socket.on('reconnect', function (data) {
        var info = {'room':'MainRoom', 'username':'ServerBot', 'msg':'----- Reconnected to server -----'};
        addMessage(info);
    });

    // Subscription to room confirmed
    socket.on('subscriptionConfirmed', function(data) {
        // Create room space in interface
        if (!roomExists(data.room)) {
            generateRoom(data.room);
        }

        // Close modal if opened
        $('#modal_joinroom').modal('hide');
    });

    // Unsubscription to room confirmed
    socket.on('unsubscriptionConfirmed', function(data) {
        // Remove room space in interface
        if (roomExists(data.room)) {
            removeRoom(data.room);
        }
    });

    // User joins room
    socket.on('userJoinsRoom', function(data) {
        console.log("userJoinsRoom: %s", JSON.stringify(data));
        // Log join in conversation
        addMessage(data);
    
        // Add user to connected users list
        addUser(data);
    });

    // User leaves room
    socket.on('userLeavesRoom', function(data) {
        console.log("userLeavesRoom: %s", JSON.stringify(data));
        // Log leave in conversation
        addMessage(data);

        // Remove user from connected users list
        removeUser(data);
    });

    // Message received
    socket.on('newMessage', function (data) {
        console.log("newMessage: %s", JSON.stringify(data));
        addMessage(data);
    });

    // Users in room received
    socket.on('usersInRoom', function(data) {
        console.log('usersInRoom: %s', JSON.stringify(data));

        // Add ServerBot user at first
        data.users.unshift({
            id: 0,
            username: "ServerBot",
            room: data.room
        });
        rooms.get(data.room).get("users").set(data.users);
    });

    // User nickname updated
    socket.on('userNicknameUpdated', function(data) {
        console.log("userNicknameUpdated: %s", JSON.stringify(data));
        updateNickname(data);

        msg = '----- ' + data.oldUsername + ' is now ' + data.newUsername + ' -----';
        var info = {'room':data.room, 'username':'ServerBot', 'msg':msg};
        addMessage(info);
    });

    // ***************************************************************************
    // Helpers
    // ***************************************************************************

    // Add room
    var addRoom = function(room) {
        generateRoom(room);
    };
    
    // Remove room
    var removeRoom = function(room) {
        var modelToRemove = rooms.get(room);
        rooms.remove(modelToRemove);
    };

    // Add message to room
    var addMessage = function(msg) {
        rooms.get(msg.room).get("messages").add(msg);
    };
    
    // Add user to connected users list
    var addUser = function(user) {
        rooms.get(user.room).get("users").add(user);
    };

    // Remove user from connected users list
    var removeUser = function(user) {
        var modelToRemove = rooms.get(user.room).get("users").where({id: user.id, room: user.room});
        rooms.get(user.room).get("users").remove(modelToRemove);
    };

    // Check if room exists
    var roomExists = function(room) {
        if (rooms.get(room)) {
            return true;
        } else {
            return false;
        }
    };

    // Get current room
    var getCurrentRoom = function() {
        return $('li[id$="_tab"][class="active"]').text().trim();
    };

    // Get message text from input field
    var getMessageText = function() {
        var text = $('#message_text').val();
        $('#message_text').val("");
        return text;
    };

    // Get room name from input field
    var getRoomName = function() {
        var name = $('#room_name').val();
        $('#room_name').val("");
        return name;
    };

    // Get nickname from input field
    var getNickname = function() {
        var nickname = $('#nickname').val();
        $('#nickname').val("");
        if (nickname != "") {
            return nickname;
        } else {
            return false;
        }
    };

    // Update nickname in badges (all collections)
    var updateNickname = function(data) {
        rooms.each(function(room) {
            var modelToChange = room.get("users").get(data.id);
            if (modelToChange) {
                modelToChange.set({"username": data.newUsername}); 
            }
        });
    };

    // ***************************************************************************
    // Events
    // ***************************************************************************

    // Send new message
    $('#b_send_message').click(function(eventObject) {
        eventObject.preventDefault();
        if ($('#message_text').val() != "") {
            socket.emit('newMessage', {'room':getCurrentRoom(), 'msg':getMessageText()});
        }
    });

    // Click button "Join room" to press Return key
    $('#room_name').keyup(function(event){
        if( event.keyCode == 13){
            $('#b_join_room').click();
        }
    });

    // Join new room
    $('#b_join_room').click(function(eventObject) {
        eventObject.preventDefault();
        socket.emit('subscribe', {'rooms':[getRoomName()]}); 
    });

    // Leave current room
    $('#b_leave_room').click(function(eventObject) {
        eventObject.preventDefault();
        var currentRoom = getCurrentRoom();
        if (currentRoom != 'MainRoom') {
            socket.emit('unsubscribe', {'rooms':[getCurrentRoom()]}); 

            // Toogle to MainRoom
            $('[href="#MainRoom"]').click();
        } else {
            console.log('Cannot leave MainRoom, sorry');
        }
    });

    // Set nickname
    $('#b_set_nickname').click(function(eventObject) {
        eventObject.preventDefault();
        var newName = getNickname();
        if (newName) {
            socket.emit('setNickname', {'username':newName});
        }

        // Close modal if opened
        $('#modal_setnick').modal('hide');
    });

    // Click button "Set nickname" to press Return key
    $('#nickname').keyup(function(event){
        if( event.keyCode == 13){
            $('#b_set_nickname').click();
        }
    });

})(jQuery);

