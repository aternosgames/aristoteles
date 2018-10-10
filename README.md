# aristoteles
Simple Discord vote bot written in NodeJS


## Usage
`.vote start [question] --options [options] --duration [time] --notify`  

`--options` - Answer options seperated by spaces, default 'Yes' and 'No'  
`--duration` - Duration in minutes, default 5  
`--notify` - Send notification when voting is over  

Example: `.vote start "What is the answer to the ultimate question of life, the universe and everything?" --options "42" "something else" --duration 5 --notify`
