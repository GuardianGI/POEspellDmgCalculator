var tabSet = function (parent, id) {
    var res = {}, tabs = [], tabSet, header, content;
    res.tabs = tabs;
    
    tabSet = document.createElement('div');
    header = document.createElement('div');
    content = document.createElement('div');
    
    tabSet.id = id;
    
    tabSet.className = 'tabSet';
    header.className = 'tabHeader';
    content.className = 'tabContent';
    
    parent.appendChild(tabSet);
    tabSet.appendChild(header);
    tabSet.appendChild(content);
    
    res.addTab = function (tabTitleText, contentNode) {
        var tabTitle = document.createElement('label'),
            tabContent = document.createElement('div');
        tabs.push(tabContent);
        
        content.appendChild(tabContent);
        header.appendChild(tabTitle);
        
        tabTitle.innerHTML = tabTitleText;
        tabContent.className = tabTitleText;
        
        tabContent.setInactive = function () {
            tabContent.style.display = 'none';
            tabTitle.className = 'none';
        };
        tabContent.setActive = function () {
            tabContent.style.display = 'block';
            tabTitle.className = 'active';
        };
        
        tabTitle.onclick = function () {
            tabs.forEach(function (tab) {
                tab.setInactive();
            });
            tabContent.setActive();
        };
        
        if (contentNode) {
            tabContent.appendChild(contentNode);
        }
        if (tabs.indexOf(tabContent) === 0) {
             tabContent.setActive();
        } else {
             tabContent.setInactive();
        }
        return tabContent;
    };
    return res;
};