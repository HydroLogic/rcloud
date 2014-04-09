RCloud.UI.init = function() {
    $("#fork-revert-notebook").click(function() {
        var is_mine = shell.notebook.controller.is_mine();
        var gistname = shell.gistname();
        var version = shell.version();
        editor.fork_or_revert_notebook(is_mine, gistname, version);
    });
    $("#open-in-github").click(function() {
        window.open(shell.github_url(), "_blank");
    });
    $("#open-from-github").click(function() {
        var result = prompt("Enter notebook ID or github URL:");
        if(result !== null)
            shell.open_from_github(result);
    });
    $("#import-notebooks").click(function() {
        shell.import_notebooks();
    });
    var saveb = $("#save-notebook");
    saveb.click(function() {
        shell.save_notebook();
    });
    shell.notebook.controller.save_button(saveb);
    $('#export-notebook-file').click(function() {
        shell.export_notebook_file();
    });
    $('#export-notebook-as-r').click(function() {
        shell.export_notebook_as_r_file();
    });
    $('#import-notebook-file').click(function() {
        shell.import_notebook_file();
    });
    $("#upload-submit").click(function() {
        if($("#file")[0].files.length===0)
            return;
        var to_notebook = ($('#upload-to-notebook').is(':checked'));
        var replacing = _.find(shell.notebook.model.assets, function(asset) {
            return asset.filename() == $("#file")[0].files[0].name;
        });
        function success(lst) {
            var path = lst[0], file = lst[1], notebook = lst[2];
            $("#file-upload-div").append(
                bootstrap_utils.alert({
                    "class": 'alert-info',
                    text: (to_notebook ? "Asset " : "File ") + file.name + (replacing ? " replaced." : " uploaded."),
                    on_close: function() {
                        $(".progress").hide();
                    }
                })
            );
            if(to_notebook) {
                var content = notebook.files[file.name].content;
                editor.update_notebook_file_list(notebook.files);
                var controller;
                if(replacing) {
                    replacing.content(content);
                    shell.notebook.controller.update_asset(replacing);
                    controller = replacing.controller;
                }
                else {
                    controller = shell.notebook.controller.append_asset(content, file.name);
                }
                controller.select();
            }
        };

        function failure(what) {
            var overwrite_click = function() {
                rcloud.upload_file(true, function(err, value) {
                    if (err) {
                        $("#file-upload-div").append(
                            bootstrap_utils.alert({
                                "class": 'alert-danger',
                                text: err
                            })
                        );
                    } else {
                        success(value);
                    }
                });
            };
            var alert_element = $("<div></div>");
            var p;
            if(what==="exists") {
                p = $("<p>File exists.</p>");
                var overwrite = bootstrap_utils
                        .button({"class": 'btn-danger'})
                        .click(overwrite_click)
                        .text("Overwrite");
                p.append(overwrite);
            }
            else if(what==="empty") {
                p = $("<p>File is empty.</p>");
            }
            else if(what==="badname") {
                p = $("<p>Filename not allowed.</p>");
            }
            alert_element.append(p);
            $("#file-upload-div").append(bootstrap_utils.alert({'class': 'alert-danger', html: alert_element}));
        }

        var upload_function = to_notebook
            ? rcloud.upload_to_notebook
            : rcloud.upload_file;

        upload_function(false, function(err, value) {
            if (err)
                failure(err);
            else
                success(value);
        });
    });

    RCloud.UI.left_panel.init();
    RCloud.UI.right_panel.init();

    var non_notebook_panel_height = 246;
    $('.notebook-tree').css('height', (window.innerHeight - non_notebook_panel_height)+'px');

    $("#search").submit(function() {
        var qry = $('#input-text-search').val();
        $('#input-text-search').blur();
        RCloud.UI.search.exec(qry);
        return false;
    });

    $("#insert-new-cell").click(function() {
        var language = $("#insert-cell-language option:selected").text();
        if (language === 'Markdown') {
            shell.new_markdown_cell("");
        } else if (language === 'R') {
            shell.new_interactive_cell("", false);
        }
        var vs = shell.notebook.view.sub_views;
        vs[vs.length-1].show_source();
    });

    // $("#new-md-cell-button").click(function() {
    //     shell.new_markdown_cell("");
    //     var vs = shell.notebook.view.sub_views;
    //     vs[vs.length-1].show_source();
    // });
    // $("#new-r-cell-button").click(function() {
    //     shell.new_interactive_cell("", false);
    //     var vs = shell.notebook.view.sub_views;
    //     vs[vs.length-1].show_source();
    // });
    $("#rcloud-logout").click(function() {
        // let the server-side script handle this so it can
        // also revoke all tokens
        window.location.href = '/logout.R';
    });

    $("#comment-submit").click(function() {
        editor.post_comment($("#comment-entry-body").val());
        return false;
    });

    $("#run-notebook").click(shell.run_notebook);

    RCloud.UI.scratchpad.init();
    RCloud.UI.command_prompt.init();
    RCloud.UI.help_frame.init();

    function make_cells_sortable() {
        var cells = $('#output');
        cells.sortable({
            items: "> .notebook-cell",
            start: function(e, info) {
                $(e.toElement).addClass("grabbing");
                // http://stackoverflow.com/questions/6140680/jquery-sortable-placeholder-height-problem
                info.placeholder.height(info.item.height());
            },
            stop: function(e, info) {
                $(e.toElement).removeClass("grabbing");
            },
            update: function(e, info) {
                var ray = cells.sortable('toArray');
                var model = info.item.data('rcloud.model'),
                    next = info.item.next().data('rcloud.model');
                shell.notebook.controller.move_cell(model, next);
            },
            handle: " .ace_gutter-layer",
            scroll: true,
            scrollSensitivity: 40,
            forcePlaceholderSize: true
        });
    }
    make_cells_sortable();

    //////////////////////////////////////////////////////////////////////////
    // autosave when exiting. better default than dropping data, less annoying
    // than prompting
    $(window).bind("unload", function() {
        shell.save_notebook();
        return true;
    });

    $(".panel-collapse").collapse({toggle: false});

    //////////////////////////////////////////////////////////////////////////
    // view mode things
    $("#edit-notebook").click(function() {
        window.location = "main.html?notebook=" + shell.gistname();
    });

};