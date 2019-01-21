# Domain Entities Map



## What is DEM??

DEM is a database structure been wrote in JSON format. DEM is designed for distributed development of a project database. DEM can describe whole database or just a part of them. DEM should be used with classic relational DBMS (MariaDB/MySQL, Postgres, ...), it is not for NoSQL DBs.

DEM is like XML mapping in [Doctrine](https://www.doctrine-project.org/projects/doctrine-orm/en/2.6/reference/xml-mapping.html#xml-mapping) or in [Hibernate](https://www.tutorialspoint.com/hibernate/hibernate_mapping_files.htm) but is focused on database structure only (PHP/Java objects structure is skipped).



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
* `sale`
* `../order`



## dot-node

All DEM nodes are branches except `.` nodes. `.` nodes contain main information about database structure. Assignment of this information depends from it placement in the DEM.


### DEM[.]

`.` node directly under the `DEM` is a `string` and means that described structure should be placed into appropriate branch in common DEM when some DEM structures are merged:

    {
      "DEM": {
        ".": "/vendor/module/submodule",
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
 
`DEM[.]` always started from root. So 

    { "DEM": { ".": "vendor/module/submodule" } }
    
is equal to

    { "DEM": { ".": "/vendor/module/submodule" } }
 
We can create many modules with DEMs inside (and with own mounting points), then combine all of them into one DEM structure. This allows us to create a single database from many DEMs.

If `DEM[.]` is omitted then all branches from this DEM will be mounted into the root. 


### branch[.]

`branch[.]` contains information about entity (table). Path to this branch is a table name:

    {
      "DEM": {
        ".": "/user",
        "group": {
          ".": {}
        }
      }
    }

Entity with name `/user/group` in DEM corresponds to table with name `user_group` in DB.

`.` structure:

    ".": {
      "desc": "",           // description: been converted to table comment;
      "attr": {},           // attributes: table columns;
      "index": {},          // indexes: unique & search;
      "relation": {}        // relations: foreign keys;
    }
    


## Entity

`.` node of a branch contains all information that is needed for table creation. Only branches with `.` node are converted into tables:

    {
      "DEM": {
        ".": "core",
        "user": {
          ".": {},
          "registry": {
            ".": {}
          },
          "group": {
            "acl": {
              ".": {}
            }
          }
        }
      }
    }

This means that 3 tables will be created:
* `core_user`
* `core_user_registry`
* `core_user_group_acl`



### Attribute

Entity attribute is a table column. Table column has ([Doctrine](https://www.doctrine-project.org/projects/doctrine-orm/en/2.6/reference/xml-mapping.html#defining-fields), [Hibernate](http://docs.jboss.org/hibernate/orm/5.4/userguide/html_single/Hibernate_User_Guide.html#basic)) own attributes:
* name
* comment
* type
* default
* nullable
* length
* scale
* precision


    {
      "DEM": {
        ".": "core",
        "user": {
          ".": {
          
        "attr": {
          "id": {
            "type": "identity",
            "desc": "Eatery ID"
          },
          "name": {
            "type": "string",
            "desc": "Eatery's default name (if not i18n)."
          }
          }
        }
      }
    }

#### Attribute Types

Currently these types are available:

* binary
* boolean
* datetime
* decimal
* identity
* integer
* reference
* text

#### Identity and Reference


### Index
### Relation




## Sample

    {
      "DEM": {
        ".": "/vendor/module",
        "user": {
          ".": {
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
            "index": {
            
            },
            "relation": {
              "./group": {
                "own": ["group_ref"],
                "foreign": ["id"],
                "on": {"delete": "restrict", "update": "restrict"}
              }
            }
          },
          "group": {
            ".": {
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