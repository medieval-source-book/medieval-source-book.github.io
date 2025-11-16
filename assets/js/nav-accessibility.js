(function(){
  function closeAll(except){
    document.querySelectorAll('.top-bar .has-dropdown > .topbar-parent[aria-expanded="true"]').forEach(function(trigger){
      if(trigger !== except){
        trigger.setAttribute('aria-expanded','false');
        var parentLi = trigger.parentElement;
        parentLi.classList.remove('open');
      }
    });
  }

  function getMenuItems(dropdown){
    return Array.prototype.slice.call(dropdown.querySelectorAll('a, button, [tabindex="0"]'));
  }

  function focusNext(items, current, delta){
    var idx = items.indexOf(current);
    var next = items[(idx + delta + items.length) % items.length];
    next.focus();
  }

  document.addEventListener('click', function(e){
    var trigger = e.target.closest('.topbar-parent[aria-haspopup="true"]');
    if(trigger){
      // If it's a pure button (href absent or '#'), toggle
      if(!trigger.getAttribute('href') || trigger.getAttribute('href') === '#'){
        var expanded = trigger.getAttribute('aria-expanded') === 'true';
        if(expanded){
          trigger.setAttribute('aria-expanded','false');
          trigger.parentElement.classList.remove('open');
        } else {
          closeAll(trigger);
          trigger.setAttribute('aria-expanded','true');
          trigger.parentElement.classList.add('open');
          var dropdown = trigger.parentElement.querySelector('ul.dropdown');
          if(dropdown){
            var items = getMenuItems(dropdown);
            if(items.length){ items[0].focus(); }
          }
        }
        e.preventDefault();
      }
    } else {
      // Click outside
      if(!e.target.closest('.top-bar')){
        closeAll();
      }
    }
  });

  document.addEventListener('keydown', function(e){
    var trigger = document.activeElement.closest('.topbar-parent[aria-haspopup="true"]');
    var insideDropdown = document.activeElement.closest('.has-dropdown.open ul.dropdown');

    // SPACE / ENTER open dropdown
    if(trigger && (e.key === 'Enter' || e.key === ' ')){
      if(trigger.getAttribute('aria-expanded') === 'false'){
        closeAll(trigger);
        trigger.setAttribute('aria-expanded','true');
        trigger.parentElement.classList.add('open');
        var dropdown = trigger.parentElement.querySelector('ul.dropdown');
        if(dropdown){
          var items = getMenuItems(dropdown);
          if(items.length){ items[0].focus(); }
        }
        e.preventDefault();
      }
    }

    // DOWN arrow from trigger opens and focuses first item
    if(trigger && e.key === 'ArrowDown'){
      var dropdown = trigger.parentElement.querySelector('ul.dropdown');
      if(dropdown){
        if(trigger.getAttribute('aria-expanded') === 'false'){
          closeAll(trigger);
          trigger.setAttribute('aria-expanded','true');
          trigger.parentElement.classList.add('open');
        }
        var items = getMenuItems(dropdown);
        if(items.length){ items[0].focus(); }
        e.preventDefault();
      }
    }

    // ESC closes active dropdown
    if((trigger || insideDropdown) && e.key === 'Escape'){
      closeAll();
      if(trigger){ trigger.focus(); }
      e.preventDefault();
    }

    // Arrow navigation within open dropdown
    if(insideDropdown && ['ArrowDown','ArrowUp'].includes(e.key)){
      var dropdown = insideDropdown;
      var items = getMenuItems(dropdown);
      var current = document.activeElement;
      if(items.length){
        focusNext(items, current, e.key === 'ArrowDown' ? 1 : -1);
        e.preventDefault();
      }
    }

    // LEFT / RIGHT between top-level triggers
    if(trigger && ['ArrowLeft','ArrowRight'].includes(e.key)){
      var triggers = Array.prototype.slice.call(document.querySelectorAll('.top-bar > section > ul.left > li.has-dropdown > .topbar-parent, .top-bar > section > ul.right > li.has-dropdown > .topbar-parent'));
      var idx = triggers.indexOf(trigger);
      var nextIdx = e.key === 'ArrowRight' ? idx + 1 : idx - 1;
      if(nextIdx < 0) nextIdx = triggers.length - 1;
      if(nextIdx >= triggers.length) nextIdx = 0;
      var nextTrigger = triggers[nextIdx];
      if(nextTrigger){
        closeAll();
        nextTrigger.focus();
        e.preventDefault();
      }
    }
  });
})();
