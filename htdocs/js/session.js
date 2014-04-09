// FIXME this is just a proof of concept - using Rserve console OOBs
var append_session_info = function(msg) {
    // one hacky way is to maintain a <pre> that we fill as we go
    // note that R will happily spit out incomplete lines so it's
    // not trivial to maintain each output in some separate structure
    if (!document.getElementById("session-info-out"))
        $("#session-info").append($("<pre id='session-info-out'></pre>"));
    $("#session-info-out").append(msg);
    RCloud.UI.right_panel.collapse($("#collapse-session-info"), false);
};

// FIXME this needs to go away as well.
var oob_handlers = {
    "browsePath": function(v) {
        var x=" "+ window.location.protocol + "//" + window.location.host + v+" ";
        $("#help-frame").attr("src", x);
        RCloud.UI.left_panel.collapse($("#collapse-help"), false);
    },
    "pager": function(v) {
	var files = v[0], header = v[1], title = v[2];
	// FIXME: show this somewhere somehow ...
	append_session_info("pager.header:" + header +"\npager.title: "+title+"\n");
	append_session_info("contents:" + files);
    },
    "editor": function(v) {
	// what is an object to edit, content is file content to edit
	var what = v[0], content = v[1], name = v[2];
	// FIXME: do somethign with it - eventually this
	// should be a modal thing - for now we shoudl at least
	// show the content ...
	append_session_info("what: "+ what + "\ncontents:" + content + "\nname: "+name+"\n");
    },
    "console.out": append_session_info,
    "console.msg": append_session_info,
    "console.err": append_session_info
    // NOTE: "idle": ... can be used to handle idle pings from Rserve if we care ..
};

RCloud.session = {
    first_session_: true,
    // FIXME rcloud.with_progress is part of the UI.
    reset: function() {
        if (this.first_session_) {
            this.first_session_ = false;
            return rcloud.with_progress();
        } else {
            return rcloud.with_progress(function(done) {
                rclient.close();
                return new Promise(function(resolve, reject) {
                    rclient = RClient.create({
                        debug: rclient.debug,
                        host: rclient.host,
                        on_connect: function(ocaps) {
                            rcloud = RCloud.create(ocaps.rcloud);
                            rcloud.session_init(rcloud.username(), rcloud.github_token());
                            rcloud.display.set_device_pixel_ratio();
                            rcloud.api.set_url(window.location);

                            resolve(rcloud.init_client_side_data().then(function() {
                                $("#output").find(".alert").remove();
                                return done;
                            }));
                        },
                        on_error: function(error) {
                            // if we fail to reconnect we still want
                            // to reject the promise so with_progress can continue.
                            if (!rclient.running) {
                                reject(done);
                            }
                            return false;
                        },
                        on_data: function(v) {
                            v = v.value.json();
                            oob_handlers[v[0]] && oob_handlers[v[0]](v.slice(1));
                        }
                    });
                });
            });
        }
    }, init: function(allow_anonymous) {
        this.first_session_ = true;

        return new Promise(function(resolve, reject) {
            rclient = RClient.create({
                debug: false,
                host:  location.href.replace(/^http/,"ws").replace(/#.*$/,""),
                on_connect: function(ocaps) {
                    rcloud = RCloud.create(ocaps.rcloud);
                    if (allow_anonymous) {
                        var promise;
                        if (rcloud.authenticated) {
                            promise = rcloud.session_init(rcloud.username(), rcloud.github_token());
                        } else {
                            promise = rcloud.anonymous_session_init();
                        }
                        promise.then(function(hello) {
                            rclient.post_response(hello);
                        });
                    } else {
                        if (!rcloud.authenticated) {
                            rclient.post_error(rclient.disconnection_error("Please login first!"));
                            rclient.close();
                            reject(new Error("Not authenticated"));
                            return;
                        }
                        rcloud.session_init(rcloud.username(), rcloud.github_token()).then(function(hello) {
                            rclient.post_response(hello);
                        }).catch(function(error) { // e.g. couldn't connect with github
                            rclient.close();
                            reject(error);
                            return;
                        });
                    }
                    rcloud.display.set_device_pixel_ratio();
                    rcloud.api.set_url(window.location.href);

                    resolve(rcloud.init_client_side_data());
                }, on_data: function(v) {
                    v = v.value.json();
                    oob_handlers[v[0]] && oob_handlers[v[0]](v.slice(1));
                }
            });
        });

    }
};