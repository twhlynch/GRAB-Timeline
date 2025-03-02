async function generate() {
    let data = [];

    const levels_response = await fetch("https://grab-tools.live/stats_data/all_verified.json");
    const levels_json = await levels_response.json();
    const leaderboards_response = await fetch("https://grab-tools.live/stats_data/timestamps_data.json");
    const leaderboards_json = await leaderboards_response.json();

    for (const level of levels_json) {
        const user_id = level.identifier.split(":")[0];
        const user_name = (level.creators || [""])[0].trim().split(" ")[0];

        let index = -1;
        for (const i in data) {
            if (data[i].user_id === user_id) {
                index = i;
                if (data[i].user_name == "") {
                    data[i].user_name = user_name;
                }
                break;
            }
        }

        if (index == -1) {
            index = data.length;

            let userIDInt = [user_id].reduce((r,v) => r * BigInt(36) + BigInt(parseInt(v,36)), 0n);
            userIDInt >>= BigInt(32);
            userIDInt >>= BigInt(32);
            const joinDate = new Date(Number(userIDInt));
            const unixTime = Math.floor(joinDate.getTime());

            data.push({
                user_id,
                user_name,
                points: [{
                    time: unixTime,
                    type: 'join'
                }]
            });
        }

        if (level.creation_timestamp) data[index].points.push({
            time: level.creation_timestamp,
            id: level.identifier,
            type: 'create'
        });
        if (level.update_timestamp) data[index].points.push({
            time: level.update_timestamp,
            id: level.identifier,
            type: 'update'
        });
    }

    let records_dict = {};
    for (const record of leaderboards_json) {
        const parts = record.split(":");
        const user_id = parts[0];
        const timestamp = parts[1] * 100;

        if (user_id in records_dict) {
            records_dict[user_id] = [
                Math.min(records_dict[user_id][0], timestamp),
                Math.max(records_dict[user_id][1], timestamp),
                records_dict[user_id][2] + 1,
            ];
        } else {
            records_dict[user_id] = [timestamp, timestamp, 1];
        }
    }
    for (const user_id in records_dict) {
        // if (records_dict[user_id][2] <= 10) continue;
        console.log(records_dict[user_id][2]);
        const [start, end] = records_dict[user_id];

        let index = -1;
        for (const i in data) {
            if (data[i].user_id === user_id) {
                index = i;
                break;
            }
        }

        /*
        if (index == -1) {
            index = data.length;

            let userIDInt = [user_id].reduce((r,v) => r * BigInt(36) + BigInt(parseInt(v,36)), 0n);
            userIDInt >>= BigInt(32);
            userIDInt >>= BigInt(32);
            const joinDate = new Date(Number(userIDInt));
            const unixTime = Math.floor(joinDate.getTime());

            data.push({
                user_id,
                user_name: '-',
                points: [{
                    time: unixTime,
                    type: 'join'
                }]
            });
        }
        //*/

        if (index != -1) {
            data[index].points.push({
                time: start,
                type: 'record'
            });
            data[index].points.push({
                time: end,
                type: 'record'
            });
        }
    }

    console.log(data);

    const timelineElement = document.getElementById('timeline');

    // data = data.filter(entry => entry.points.length > 2);

    let min = Math.min(...data.map(entry => Math.min(...entry.points.map(p => p.time))));
    let max = Math.max(...data.map(entry => Math.max(...entry.points.map(p => p.time))));

    // let scale = 100000000;
    let scale = (max - min) / (window.innerWidth - 100);

    data.forEach(entry => {
        const { user_id, user_name, points } = entry;

        entry.start = Math.min(...points.map(p => p.time));
        entry.end = Math.max(...points.map(p => p.time));
    });

    // longest
    // data.sort((a, b) => (b.end - b.start) - (a.end - a.start));
    
    // shortest
    // data.sort((a, b) => (a.end - a.start) - (b.end - b.start));

    // start
    data.sort((a, b) => a.start - b.start);

    // levels
    // data.sort((a, b) => b.points.filter(p => p.type == 'create').length - a.points.filter(p => p.type == 'create').length);

    // newest level
    // data.sort((a, b) => Math.max(...b.points.filter(p => p.type == 'create' || p.type == 'update').map(p => p.time)) - Math.max(...a.points.filter(p => p.type == 'create' || p.type == 'update').map(p => p.time)));
    
    // oldest level
    // data.sort((a, b) => Math.min(...a.points.filter(p => p.type == 'create' || p.type == 'update').map(p => p.time)) - Math.min(...b.points.filter(p => p.type == 'create' || p.type == 'update').map(p => p.time)));

    // time to make first level
    // data.sort((a, b) => (Math.min(...b.points.filter(p => p.type == 'create' || p.type == 'update').map(p => p.time)) - b.start) - (Math.min(...a.points.filter(p => p.type == 'create' || p.type == 'update').map(p => p.time)) - a.start));

    // most recent record
    // data.sort((a, b) => Math.max(...b.points.filter(p => p.type == 'record').map(p => p.time)) - Math.max(...a.points.filter(p => p.type == 'record').map(p => p.time)));

    data.forEach((entry) => {
        const { user_id, user_name, points, start, end } = entry;

        const entryElement = document.createElement('div');
        entryElement.style.marginLeft = (start - min) / scale + 'px';
        entryElement.style.width = (end - start) / scale + 'px';

        const userNameElement = document.createElement('span');
        userNameElement.textContent = user_name;
        entryElement.appendChild(userNameElement);
        
        const dateElement = document.createElement('i');
        const date = new Date(end);
        dateElement.textContent = date.getDate() + ' ' + date.getMonth() + ' ' + date.getFullYear();
        entryElement.appendChild(dateElement);

        points.forEach((point) => {
            const dotElement = document.createElement('a');
            dotElement.target = "_blank";
            dotElement.href = point.id ? `https://grabvr.quest/levels/viewer?level=${point.id}` : `https://grabvr.quest/levels?tab=tab_other_user&user_id=${user_id}`;
            dotElement.style.left = (point.time - start) / scale + 'px';
            dotElement.className = point.type;
            entryElement.appendChild(dotElement);
        });

        // sorting
        entryElement.setAttribute("data-longest", (end - start));
        entryElement.setAttribute("data-start", -start);
        entryElement.setAttribute("data-end", end);
        entryElement.setAttribute("data-levels", points.filter(p => p.type == 'create').length);
        entryElement.setAttribute("data-newest", Math.max(...points.filter(p => p.type == 'create' || p.type == 'update').map(p => p.time)));
        entryElement.setAttribute("data-oldest", -Math.min(...points.filter(p => p.type == 'create' || p.type == 'update').map(p => p.time)));
        entryElement.setAttribute("data-first", (Math.min(...points.filter(p => p.type == 'create' || p.type == 'update').map(p => p.time)) - start));
        entryElement.setAttribute("data-record", Math.max(...points.filter(p => p.type == 'record').map(p => p.time)));

        timelineElement.appendChild(entryElement);
    });

    // buttons
    const sorts = [
        "longest",
        "start",
        "end",
        "levels",
        "newest",
        "oldest",
        "first",
        "record"
    ];
    const buttons = document.querySelectorAll('.sort');
    sorts.forEach(sort => {
        const button = document.getElementById(sort);
        button.addEventListener('click', () => {
            buttons.forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');
            const sortedChildren = Array.from(timelineElement.childNodes).sort((a, b) => {
                return b.getAttribute('data-' + sort) - a.getAttribute('data-' + sort);
            });
            timelineElement.innerHTML = '';
            sortedChildren.forEach(child => {
                timelineElement.appendChild(child);
            });
        });
    });

    document.getElementById("loading").style.display = "none";
}

generate();