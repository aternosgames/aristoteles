# aristoteles
Simple Discord vote bot written in NodeJS


## Usage
`.vote start <question> --options <options> --duration <time> --notify [--advanced]`  

`--options` - Answer options separated by spaces, default 'Yes' and 'No'  
`--duration` - Duration in minutes, default 5  
`--notify` - Send notification when voting is over  
`--advanced` - Reactions are not removed immediately and voters can change or withdraw their votes,
            looks a bit better but is not recommended for greater amounts of potential voters

Example: `.vote start "What is the answer to the ultimate question of life, the universe and everything?" 
--options "42" "something else" --duration 5 --notify`
