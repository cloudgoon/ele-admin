/**
 * 登录状态管理
 */
import axios from 'axios';
import {util} from 'ele-admin';
import setting from '@/config/setting';

export default {
  namespaced: true,
  state: {
    // 当前用户信息
    user: setting.takeUser(),
    // 当前用户权限
    authorities: [],
    // 当前用户角色
    roles: [],
    // 当前用户的菜单
    menus: null,
    // 当前打开的选项卡
    tabs: []
  },
  mutations: {
    SET: (state, obj) => {
      state[obj.key] = obj.value;
    },
    SET_TOKEN: (state, obj) => {
      setting.cacheToken(obj.token, obj.remember);
      state.token = obj.token;
      if (!obj.token) {
        state.user = {};
        state.menus = null;
        state.tabs = [];
        setting.cacheUser();
      }
    },
    TAB_PUSH(state, obj) {
      if (!state.tabs.some(r => r.path === obj.path)) {
        state.tabs = state.tabs.concat([obj]);
      }
    }
  },
  actions: {
    /**
     * 缓存token
     * @param commit
     * @param token {String, {token: String, remember: String}}
     */
    setToken({commit}, token) {
      let remember = true;
      if (typeof token === 'object') {
        remember = token.remember;
        token = token.token;
      }
      commit('SET_TOKEN', {token: token, remember: remember});
    },
    /**
     * 移除token
     * @param commit
     */
    removeToken({commit}) {
      commit('SET_TOKEN', {});
    },
    /**
     * 缓存用户信息
     * @param commit
     * @param user {Object} 用户信息
     */
    setUser({commit}, user) {
      setting.cacheUser(user);
      commit('SET', {key: 'user', value: user});
    },
    /**
     * 设置用户权限
     * @param commit
     * @param authorities {Array<String>} 权限
     */
    setAuthorities({commit}, authorities) {
      commit('SET', {key: 'authorities', value: authorities});
    },
    /**
     * 设置用户角色
     * @param commit
     * @param roles {Array<String>} 角色
     */
    setRoles({commit}, roles) {
      commit('SET', {key: 'roles', value: roles});
    },
    /**
     * 设置用户菜单
     * @param commit
     * @param menus {Array<Object>} 菜单
     */
    setMenus({commit}, menus) {
      commit('SET', {key: 'menus', value: menus});
    },
    /**
     * 获取用户菜单路由
     * @param commit
     * @returns {Promise<Object>} {menus: Array, home: String}
     */
    getMenus({commit}) {
      return new Promise((resolve, reject) => {
        if (!setting.menuUrl) {
          let menus = setting.menus || [];
          commit('SET', {key: 'menus', value: menus});
          return resolve({menus: menus});
        }
        axios.get(setting.menuUrl).then(res => {
          let result = setting.parseMenu ? setting.parseMenu(res.data) : res.data, home = null;
          // 获取用户的信息、角色、权限
          if (result.user) {
            setting.cacheUser(result.user);
            commit('SET', {key: 'user', value: result.user});
            commit('SET', {key: 'roles', value: result.user.roles});
            commit('SET', {key: 'authorities', value: result.user.authorities});
          }
          // 获取用户的菜单
          if (!result.data) {
            return reject(new Error(result.msg));
          }
          let menus = util.formatTreeData(result.data, (d) => {
            let item = setting.parseMenuItem ? setting.parseMenuItem(d) : Object.assign({}, d);
            item.meta = Object.assign({
              title: item.title,
              icon: item.icon,
              hide: item.hide,
              active: item.active || item.uid,
              hideFooter: item.hideFooter,
              hideSidebar: item.hideSidebar
            }, item.meta);
            if (!item.children || !item.children.length) {
              if (!home && item.path && !(
                item.path.startsWith('http://') ||
                item.path.startsWith('https://') ||
                item.path.startsWith('//')
              )) {
                home = item.path;
                if (!setting.homeTitle) {
                  setting.homeTitle = item.title;
                }
              }
            } else if (item.children[0].path) {
              if (!item.redirect) {
                item.redirect = item.children[0].path;
              }
              if (!item.path) {
                const cp = item.children[0].path;
                item.path = cp.substring(0, cp.lastIndexOf('/'));
              }
            }
            return item;
          });
          commit('SET', {key: 'menus', value: menus});
          resolve({menus: menus, home: home});
        }).catch(e => {
          reject(e);
        });
      });
    },
    /**
     * 添加新tab
     * @param commit
     * @param obj {{path: String, title: String}} tab信息
     */
    tabAdd({commit}, obj) {
      commit('TAB_PUSH', obj);
    },
    /**
     * 关闭指定tab
     * @param commit
     * @param state
     * @param path {String} tab路由
     * @returns {Promise<Number>} 前一个tab位置
     */
    tabRemove({commit, state}, path) {
      return new Promise((resolve) => {
        let lastIndex = -1, lastPath, last;
        for (let i = 0; i < state.tabs.length; i++) {
          if (state.tabs[i].path === path) {
            break;
          }
          lastIndex = i;
          last = state.tabs[i];
          lastPath = last.path;
        }
        commit('SET', {key: 'tabs', value: state.tabs.filter(d => d.path !== path)});
        resolve({lastIndex: lastIndex, lastPath: lastPath, last: last});
      });
    },
    /**
     * 关闭所有tab
     * @param commit
     */
    tabRemoveAll({commit}) {
      commit('SET', {key: 'tabs', value: []});
    },
    /**
     * 关闭左侧tab
     * @param commit
     * @param state
     * @param path {String} tab路由
     */
    tabRemoveLeft({commit, state}, path) {
      for (let i = 0; i < state.tabs.length; i++) {
        if (state.tabs[i].path === path) {
          commit('SET', {key: 'tabs', value: state.tabs.slice(i)});
          break;
        }
      }
    },
    /**
     * 关闭右侧tab
     * @param commit
     * @param state
     * @param path {String} tab路由
     */
    tabRemoveRight({commit, state}, path) {
      for (let i = 0; i < state.tabs.length; i++) {
        if (state.tabs[i].path === path) {
          commit('SET', {key: 'tabs', value: state.tabs.slice(0, i + 1)});
          break;
        }
      }
    },
    /**
     * 关闭其他tab
     * @param commit
     * @param state
     * @param path {String} tab路由
     */
    tabRemoveOther({commit, state}, path) {
      commit('SET', {key: 'tabs', value: state.tabs.filter(d => d.path === path)});
    },
    /**
     * 修改指定tab标题
     * @param commit
     * @param state
     * @param obj {{path: String, title: String, closable: Boolean}}
     */
    tabSetTitle({commit, state}, obj) {
      let i = state.tabs.findIndex(d => d.path === obj.path),
        data = Object.assign({}, state.tabs[i]);
      if (typeof obj.title !== 'undefined') {
        data.title = obj.title;
      }
      if (typeof obj.closable !== 'undefined') {
        data.closable = obj.closable;
      }
      let tabs = state.tabs.slice(0, i).concat([data]).concat(state.tabs.slice(i + 1));
      commit('SET', {key: 'tabs', value: tabs});
    }
  }
}
