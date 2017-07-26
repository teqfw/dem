# Domain Entities Map



## What is DEM?

DEM is a database structure wrote in JSON format. DEM can describe whole database or just a part of them:

    {"DEM": {}} 



## Path

`path` keyword defines the prefix for tables that are described by current DEM:

    {
      "DEM": {
        "path": "/vendor/module/submodule"
      }
    }

This means that all tables names described by the DEM will start with `vendor_module_submodule_` prefix. We can create many modules with DEMs inside (and with own paths), then combine all of them into one DEM structure. Then create a single database from this aggregated  DEM.

Path in DEM is like a path in filesystem - absolute (starts with '/') or relative (starts with './', '../' or just a name).

Path can be omitted. In this case tables will be created without prefix. 

## Entity

`entity` in DEM is a table in DB:

    {
      "DEM": {
        "path": "/user",
        "entity": {
          "registry": {},
          "group": {}
        }
      }
    }

This means that 2 tables will be created:
* `user_registry`
* `user_group`



## Subs (nested entities)

`sub` is a keyword and this keyword describes not new entity `sub` but group of the _nested entities_:

    {
      "DEM": {
        "path": "/user",
        "entity": {
          "registry": {},
          "group": {
            "sub": {
              "acl":{}
            }
          }
        }
      }
    }

2 tables will be created:
* `user_registry`
* `user_group`
* `user_group_acl`



## Sample

    {
      "DEM": {
        "path": "/vendor/module",
        "entity": {
          "user": {
            "desc": "User data.",
            "attr": {
              "id": {
                "desc": "Entity ID.",
                "increment": true
              },
              "group_ref": {
                "desc": "User Group reference.",
                "reference": true
              }
            },
            "index": {},
            "relation": {
              "to_group": {
                "own": ["group_ref"],
                "ref": {
                  "path": "group",
                  "attrs": ["id"]
                },
                "on": {"delete": "restrict", "update": "restrict"}
              }
            },
            "sub": {
              "entity": {
                "group": {
                  "desc": "User Group data.",
                  "attr": {
                    "id": {
                      "desc": "Entity ID.",
                      "increment": true
                    }
                  }
                }
              }
            }
          }
        }
      }
    }