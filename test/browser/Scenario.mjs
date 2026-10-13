// @ts-check
/** Multiple independently owned schemas and an explicit host dependency binding. */
export function scenario(){
    return {
        schemas:[
            {packageName:'@example/accounts',filename:'etc/dem-schema.json',document:{$format:1,'/vnd/accounts/user':{attributes:[{name:'user_key',type:{name:'identity'}}]}}},
            {packageName:'@example/sale',filename:'etc/dem-schema.json',document:{$format:1,$dependencies:{user:{attributes:['id']}},'/vnd/sale/order':{attributes:[{name:'id',type:{name:'identity'}},{name:'user_id',type:{name:'ref'}}],relations:{owner:{attributes:['user_id'],target:{dependency:'user',attributes:['id']}}}}}},
            {packageName:'@example/customer',filename:'etc/dem-schema.json',document:{$format:1,$dependencies:{user:{attributes:['id']}},'/vnd/customer/address':{attributes:[{name:'id',type:{name:'identity'}},{name:'owner_id',type:{name:'ref'},nullable:true}],relations:{owner:{attributes:['owner_id'],target:{dependency:'user',attributes:['id']}}}}}},
        ],
        map:{packageName:'@example/host',filename:'etc/dem-map.json',document:{$format:1,sources:{'@example/accounts':{rename:{'/vnd/accounts/':'/app/accounts/'}},'@example/sale':{rename:{'/vnd/sale/':'/app/sale/'},bind:{user:{path:'/app/accounts/user',attributes:{id:'user_key'}}}},'@example/customer':{bind:{user:{path:'/app/accounts/user',attributes:{id:'user_key'}}}}},identityProfiles:{'/app/accounts/user':{user_key:{type:'uuid'}}}}},
    };
}
