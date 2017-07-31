# Domain Entities Map



## What is DEM?

DEM is a database structure been wrote in JSON format. DEM is designed for distributed development of a project database. DEM can describe whole database or just a part of them. DEM should be used with classic relational DBMS (MariaDB/MySQL, Postgres, ...), it is not for NoSQL DBs.



## DEM root

    {"DEM": {}} 



## Branch

Every node in DEM is a branch (`user`, `sale`) or nested branch (`user/group`, `sale/order`).

    {
      "DEM": {
        "user": {
          "group": {}
        },
        "sale": {
          "order": {}
        }
      }
    }



## Paths

Path is a chain of branches starting from `DEM` node. Path in DEM is like a path in filesystem - absolute (starts with '/') or relative (starts with './', '../' or just a name).

* `/user`
* `/user/group`
* `/sale`
* `/sale/order`



## .dat

All DEM nodes are branches except `.dat` nodes. `.dat` nodes contain main information about database structure. Assignment of this information depends from it placement in the DEM.


### DEM[.dat]

`.dat` node directly under the `DEM` is a `string` and means that described structure should be placed into appropriate branch in common DEM when some DEM structures are merged:

    {
      "DEM": {
        ".dat": "/vendor/module/submodule",
        "customer": {}
      }
    }

This DEM will be converted into:
 
    {
      "DEM": {
        "vendor": {
          "module": {
            "submodule": {
              "customer": {}
            }
          }
        }
      }
    }
 
before merge.
 
`DEM[.dat]` always started from root. So 

    { "DEM": { ".dat": "vendor/module/submodule" } }
    
is equal to

    { "DEM": { ".dat": "/vendor/module/submodule" } }
 
We can create many modules with DEMs inside (and with own mounting points), then combine all of them into one DEM structure. This allows us to create a single database from many DEMs.

If `DEM[.dat]` is omitted then all branches from this DEM will be mounted into the root. 


### branch[.dat]

`branch[.dat]` contains information about entity (table). Path to this branch is a table name:

    {
      "DEM": {
        ".dat": "/user",
        "group": {
          ".dat": {}
        }
      }
    }

Entity with name `/user/group` in DEM corresponds to table with name `user_group` in DB.

`.dat` structure:

    ".dat": {
      "desc": "",           // description: been converted to table comment;
      "attr": {},           // attributes: table columns;
      "index": {},          // indexes: unique & search;
      "relation": {}        // relations: foreign keys;
    }
    


## Entity

`.dat` node of a branch contains all information that is needed for table creation. Only branches with `.dat` node are converted into tables:

    {
      "DEM": {
        ".dat": "core",
        "user": {
          ".dat": {},
          "registry": {
            ".dat": {}
          },
          "group": {
            "acl": {
              ".dat": {}
            }
          }
        }
      }
    }

This means that 3 tables will be created:
* `core_user`
* `core_user_registry`
* `core_user_group_acl`




## Sample

    {
      "DEM": {
        ".dat": "/vendor/module",
        "user": {
          ".dat": {
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
              "./group": {
                "own": ["group_ref"],
                "foreign": ["id"],
                "on": {"delete": "restrict", "update": "restrict"}
              }
            }
          },
          "group": {
            ".dat": {
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